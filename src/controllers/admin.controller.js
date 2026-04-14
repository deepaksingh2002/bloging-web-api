import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { Subscription } from "../models/subscription.model.js";
import { AboutProfile } from "../models/aboutProfile.model.js";
import { ModerationLog } from "../models/moderationLog.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hasAdminAccess } from "../middlewares/role.middleware.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import mongoose from "mongoose";

const firstCount = (arr, key = "count") => (arr?.[0]?.[key] || 0);

const parseDateValue = (rawValue, label) => {
  if (!rawValue) return null;

  const parsed = new Date(String(rawValue));
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Invalid ${label} date`);
  }

  return parsed;
};

const parseLimit = (rawValue, fallback, label) => {
  if (rawValue === undefined) return fallback;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new ApiError(400, `${label} must be an integer between 1 and 50`);
  }

  return parsed;
};

const parsePage = (rawValue, fallback = 1) => {
  if (rawValue === undefined) return fallback;

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "page must be a positive integer");
  }

  return parsed;
};

const buildDateRangeMatch = (fromDate, toDate, field = "createdAt") => {
  if (!fromDate && !toDate) {
    return null;
  }

  const range = {};
  if (fromDate) range.$gte = fromDate;
  if (toDate) range.$lte = toDate;

  return { [field]: range };
};

const getPendingApplicantById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const applicant = await User.findById(userId);
  if (!applicant) {
    throw new ApiError(404, "Applicant user not found");
  }

  if (applicant.role === "admin") {
    throw new ApiError(400, "Admin user cannot be reviewed as author applicant");
  }

  if (applicant.authorApplication?.status !== "pending") {
    throw new ApiError(400, "No pending author application found for this user");
  }

  return applicant;
};

const ensureValidObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label} id`);
  }
};

const createModerationLog = async ({ adminId, action, targetType, targetId, reason, snapshot }) => {
  await ModerationLog.create({
    admin: adminId,
    action,
    targetType,
    targetId,
    reason: String(reason || "").trim(),
    snapshot: snapshot || {},
  });
};

const getPendingAuthorApplications = asyncHandler(async (_req, res) => {
  const users = await User.find({
    role: "user",
    "authorApplication.status": "pending",
  })
    .select("fullName username email authorApplication createdAt")
    .sort({ "authorApplication.appliedAt": 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Pending author applications fetched successfully"));
});

const getAdminUsers = asyncHandler(async (req, res) => {
  const page = parsePage(req.query?.page, 1);
  const limit = parseLimit(req.query?.limit, 12, "limit");
  const skip = (page - 1) * limit;
  const searchQuery = String(req.query?.q || "").trim();
  const roleFilter = String(req.query?.role || "").trim().toLowerCase();
  const sortBy = String(req.query?.sortBy || "createdAt").trim().toLowerCase();
  const sortOrder = String(req.query?.sortOrder || "desc").trim().toLowerCase();

  const query = {};
  const sortFieldMap = {
    createdat: "createdAt",
    fullname: "fullName",
    username: "username",
    email: "email",
  };
  const normalizedSortBy = sortFieldMap[sortBy] || "createdAt";
  const normalizedSortOrder = sortOrder === "asc" ? 1 : -1;
  const sortConfig = { [normalizedSortBy]: normalizedSortOrder };

  if (searchQuery) {
    query.$or = [
      { fullName: { $regex: searchQuery, $options: "i" } },
      { username: { $regex: searchQuery, $options: "i" } },
      { email: { $regex: searchQuery, $options: "i" } },
    ];
  }

  if (["user", "author", "admin", "superadmin"].includes(roleFilter)) {
    query.role = roleFilter;
  }

  const [users, total] = await Promise.all([
    User.find(query)
    .select("_id fullName username email avatar bio role authorApplication.status createdAt updatedAt")
    .skip(skip)
    .limit(limit)
    .sort(sortConfig)
    .lean(),
    User.countDocuments(query),
  ]);

  if (!users.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          users: [],
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(Math.ceil(total / limit), 1),
            hasNextPage: false,
            hasPreviousPage: page > 1,
          },
          filters: {
            q: searchQuery,
            role: roleFilter || null,
            sortBy: normalizedSortBy,
            sortOrder: normalizedSortOrder === 1 ? "asc" : "desc",
          },
        },
        "Users fetched successfully"
      )
    );
  }

  const userIds = users.map((user) => user._id);

  const [followerAgg, followingAgg, postAgg] = await Promise.all([
    Subscription.aggregate([
      { $match: { channel: { $in: userIds } } },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]),
    Subscription.aggregate([
      { $match: { subscriber: { $in: userIds } } },
      { $group: { _id: "$subscriber", count: { $sum: 1 } } },
    ]),
    Post.aggregate([
      { $match: { owner: { $in: userIds } } },
      { $group: { _id: "$owner", count: { $sum: 1 } } },
    ]),
  ]);

  const followersByUserId = new Map(
    followerAgg.map((entry) => [String(entry._id), Number(entry.count) || 0])
  );
  const followingByUserId = new Map(
    followingAgg.map((entry) => [String(entry._id), Number(entry.count) || 0])
  );
  const postsByUserId = new Map(
    postAgg.map((entry) => [String(entry._id), Number(entry.count) || 0])
  );

  const payload = users.map((user) => ({
    ...user,
    followerCount: followersByUserId.get(String(user._id)) || 0,
    followingCount: followingByUserId.get(String(user._id)) || 0,
    postCount: postsByUserId.get(String(user._id)) || 0,
  }));

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users: payload,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        filters: {
          q: searchQuery,
          role: roleFilter || null,
          sortBy: normalizedSortBy,
          sortOrder: normalizedSortOrder === 1 ? "asc" : "desc",
        },
      },
      "Users fetched successfully"
    )
  );
});

const getAdminUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const user = await User.findById(userId)
    .select("_id fullName username email avatar bio role authorApplication createdAt updatedAt")
    .lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const [postCount, followerCount, followingCount, commentCount, likeCount, recentPosts] =
    await Promise.all([
      Post.countDocuments({ owner: userId }),
      Subscription.countDocuments({ channel: userId }),
      Subscription.countDocuments({ subscriber: userId }),
      Comment.countDocuments({ owner: userId }),
      Like.countDocuments({ user: userId }),
      Post.find({ owner: userId })
        .select("_id title thumbnail catagry views isPublished createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          ...user,
          postCount,
          followerCount,
          followingCount,
          commentCount,
          likeCount,
        },
        recentPosts,
      },
      "User profile fetched successfully"
    )
  );
});

const reviewAuthorApplication = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { action, rejectionReason } = req.body;

  const normalizedAction = String(action || "").trim().toLowerCase();
  if (!["approve", "reject"].includes(normalizedAction)) {
    throw new ApiError(400, "Action must be either 'approve' or 'reject'");
  }

  const applicant = await getPendingApplicantById(userId);

  applicant.authorApplication.reviewedAt = new Date();
  applicant.authorApplication.reviewedBy = req.user?._id;

  if (normalizedAction === "approve") {
    applicant.role = "author";
    applicant.authorApplication.status = "approved";
    applicant.authorApplication.rejectionReason = "";
  } else {
    applicant.role = "user";
    applicant.authorApplication.status = "rejected";
    applicant.authorApplication.rejectionReason = rejectionReason?.trim() || "Application rejected";
  }

  await applicant.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: applicant._id,
        role: applicant.role,
        authorApplication: applicant.authorApplication,
      },
      `Author application ${normalizedAction}d successfully`
    )
  );
});

const approveAuthorApplication = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const applicant = await getPendingApplicantById(userId);

  applicant.role = "author";
  applicant.authorApplication.status = "approved";
  applicant.authorApplication.reviewedAt = new Date();
  applicant.authorApplication.reviewedBy = req.user?._id;
  applicant.authorApplication.rejectionReason = "";

  await applicant.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: applicant._id,
        role: applicant.role,
        authorApplication: applicant.authorApplication,
      },
      "Author approved successfully"
    )
  );
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const fromDate = parseDateValue(req.query?.from, "from");
  const toDate = parseDateValue(req.query?.to, "to");

  if (fromDate && toDate && fromDate > toDate) {
    throw new ApiError(400, "from date must be less than or equal to to date");
  }

  const recentPostsLimit = parseLimit(req.query?.recentLimit, 5, "recentLimit");
  const pendingAppsLimit = parseLimit(req.query?.pendingLimit, 5, "pendingLimit");

  const createdAtMatch = buildDateRangeMatch(fromDate, toDate, "createdAt");
  const applicationDateMatch = buildDateRangeMatch(
    fromDate,
    toDate,
    "authorApplication.appliedAt"
  );

  const [userAgg, postAgg, likeAgg, commentAgg, subscriptionAgg, recentPosts, pendingApplications] =
    await Promise.all([
      User.aggregate([
        {
          $facet: {
            totals: [{ $count: "count" }],
            roles: [
              { $group: { _id: "$role", count: { $sum: 1 } } },
              { $project: { _id: 0, role: "$_id", count: 1 } },
            ],
            pendingApplications: [
              { $match: { "authorApplication.status": "pending" } },
              { $count: "count" },
            ],
          },
        },
      ]),
      Post.aggregate([
        ...(createdAtMatch ? [{ $match: createdAtMatch }] : []),
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalPosts: { $sum: 1 },
                  publishedPosts: {
                    $sum: { $cond: [{ $eq: ["$isPublished", true] }, 1, 0] },
                  },
                  totalViews: { $sum: "$views" },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalPosts: 1,
                  publishedPosts: 1,
                  totalViews: 1,
                },
              },
            ],
            categoryBreakdown: [
              { $group: { _id: "$catagry", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $project: { _id: 0, category: "$_id", count: 1 } },
            ],
          },
        },
      ]),
      Like.aggregate([
        ...(createdAtMatch ? [{ $match: createdAtMatch }] : []),
        {
          $facet: {
            postLikes: [{ $match: { post: { $ne: null } } }, { $count: "count" }],
            commentLikes: [{ $match: { comment: { $ne: null } } }, { $count: "count" }],
          },
        },
      ]),
      Comment.aggregate([
        ...(createdAtMatch ? [{ $match: createdAtMatch }] : []),
        { $count: "count" },
      ]),
      Subscription.aggregate([
        ...(createdAtMatch ? [{ $match: createdAtMatch }] : []),
        { $count: "count" },
      ]),
      Post.aggregate([
        ...(createdAtMatch ? [{ $match: createdAtMatch }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: recentPostsLimit },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
          },
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            title: 1,
            catagry: 1,
            views: 1,
            createdAt: 1,
            owner: {
              _id: "$owner._id",
              username: "$owner.username",
              fullName: "$owner.fullName",
            },
          },
        },
      ]),
      User.aggregate([
        {
          $match: {
            "authorApplication.status": "pending",
            ...(applicationDateMatch || {}),
          },
        },
        { $sort: { "authorApplication.appliedAt": 1 } },
        { $limit: pendingAppsLimit },
        {
          $project: {
            _id: 1,
            fullName: 1,
            username: 1,
            email: 1,
            authorApplication: 1,
          },
        },
      ]),
    ]);

  const userOverview = userAgg?.[0] || { totals: [], roles: [], pendingApplications: [] };
  const postOverview = postAgg?.[0] || { totals: [], categoryBreakdown: [] };
  const likeOverview = likeAgg?.[0] || { postLikes: [], commentLikes: [] };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users: {
          total: firstCount(userOverview.totals),
          byRole: userOverview.roles || [],
          pendingAuthorApplications: firstCount(userOverview.pendingApplications),
        },
        posts: {
          ...(postOverview.totals?.[0] || {
            totalPosts: 0,
            publishedPosts: 0,
            totalViews: 0,
          }),
          byCategory: postOverview.categoryBreakdown || [],
        },
        engagement: {
          comments: firstCount(commentAgg),
          postLikes: firstCount(likeOverview.postLikes),
          commentLikes: firstCount(likeOverview.commentLikes),
          subscriptions: firstCount(subscriptionAgg),
        },
        filters: {
          from: fromDate ? fromDate.toISOString() : null,
          to: toDate ? toDate.toISOString() : null,
          recentLimit: recentPostsLimit,
          pendingLimit: pendingAppsLimit,
        },
        recentPosts,
        pendingApplications,
      },
      "Admin dashboard fetched successfully"
    )
  );
});

const getAdminProfile = asyncHandler(async (req, res) => {
  const adminId = req.user?._id;

  const [adminProfile, reviewStats, resumeInfo] = await Promise.all([
    User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(adminId) } },
      {
        $project: {
          _id: 1,
          fullName: 1,
          username: 1,
          email: 1,
          avatar: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]),
    User.aggregate([
      {
        $match: {
          "authorApplication.reviewedBy": new mongoose.Types.ObjectId(adminId),
          "authorApplication.reviewedAt": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$authorApplication.status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
    ]),
    AboutProfile.aggregate([
      { $match: { singletonKey: "about_profile" } },
      {
        $project: {
          _id: 0,
          resumeUrl: 1,
          resumeFile: 1,
          updatedAt: 1,
          updatedBy: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedByUser",
        },
      },
      { $unwind: { path: "$updatedByUser", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          resumeUrl: 1,
          resumeFile: 1,
          updatedAt: 1,
          updatedBy: {
            _id: "$updatedByUser._id",
            username: "$updatedByUser.username",
            fullName: "$updatedByUser.fullName",
          },
        },
      },
    ]),
  ]);

  if (!adminProfile?.length) {
    throw new ApiError(404, "Admin profile not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: adminProfile[0],
        reviewedApplications: reviewStats,
        resume: resumeInfo?.[0] || null,
      },
      "Admin profile fetched successfully"
    )
  );
});

const updateAdminProfile = asyncHandler(async (req, res) => {
  const adminId = req.user?._id;
  const { fullName, bio } = req.body;
  const avatarLocalPath = req.file?.path;

  const user = await User.findById(adminId);
  if (!user) {
    throw new ApiError(404, "Admin user not found");
  }

  const updatedData = {};
  if (fullName !== undefined) updatedData.fullName = String(fullName).trim();
  if (bio !== undefined) updatedData.bio = String(bio).trim();

  let uploadedAvatar = null;
  if (avatarLocalPath) {
    uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
    await fs.promises.unlink(avatarLocalPath);

    if (!uploadedAvatar?.url) {
      throw new ApiError(500, "Error while uploading avatar");
    }
  }

  if (!Object.keys(updatedData).length && !uploadedAvatar) {
    throw new ApiError(400, "At least one field is required to update profile");
  }

  const previousAvatar = user.avatar;
  if (updatedData.fullName !== undefined) user.fullName = updatedData.fullName;
  if (updatedData.bio !== undefined) user.bio = updatedData.bio;
  if (uploadedAvatar?.url) user.avatar = uploadedAvatar.url;

  await user.save({ validateBeforeSave: true });

  if (previousAvatar && uploadedAvatar?.url && previousAvatar !== uploadedAvatar.url) {
    const publicId = previousAvatar.split("/").pop().split(".")[0];
    await deleteFromCloudinary(publicId);
  }

  const updatedAdmin = await User.findById(adminId)
    .select("_id fullName username email avatar bio role createdAt updatedAt")
    .lean();

  return res.status(200).json(
    new ApiResponse(200, { profile: updatedAdmin }, "Admin profile updated successfully")
  );
});

const deleteAnyPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const reason = req.body?.reason || req.query?.reason || "";
  ensureValidObjectId(postId, "post");

  const post = await Post.findById(postId).select("_id owner title catagry views createdAt");
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const commentIds = await Comment.find({ post: postId }).distinct("_id");
  const deletedCommentsCount = commentIds.length;
  let deletedCommentLikesCount = 0;
  if (commentIds.length) {
    deletedCommentLikesCount = await Like.countDocuments({ comment: { $in: commentIds } });
    await Like.deleteMany({ comment: { $in: commentIds } });
    await Comment.deleteMany({ post: postId });
  }

  const deletedPostLikesCount = await Like.countDocuments({ post: postId });
  await Like.deleteMany({ post: postId });
  await Post.findByIdAndDelete(postId);

  await createModerationLog({
    adminId: req.user?._id,
    action: "delete_post",
    targetType: "post",
    targetId: post._id,
    reason,
    snapshot: {
      post: {
        _id: post._id,
        owner: post.owner,
        title: post.title,
        catagry: post.catagry,
        views: post.views,
        createdAt: post.createdAt,
      },
      cascade: {
        deletedCommentsCount,
        deletedPostLikesCount,
        deletedCommentLikesCount,
      },
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deletedPostId: post._id,
        deletedPostTitle: post.title,
      },
      "Post deleted by admin successfully"
    )
  );
});

const deleteAnyComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const reason = req.body?.reason || req.query?.reason || "";
  ensureValidObjectId(commentId, "comment");

  const comment = await Comment.findById(commentId).select("_id post owner content createdAt");
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const deletedCommentLikesCount = await Like.countDocuments({ comment: commentId });
  await Like.deleteMany({ comment: commentId });
  await Comment.findByIdAndDelete(commentId);

  await createModerationLog({
    adminId: req.user?._id,
    action: "delete_comment",
    targetType: "comment",
    targetId: comment._id,
    reason,
    snapshot: {
      comment: {
        _id: comment._id,
        post: comment.post,
        owner: comment.owner,
        content: comment.content,
        createdAt: comment.createdAt,
      },
      cascade: {
        deletedCommentLikesCount,
      },
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deletedCommentId: comment._id,
        postId: comment.post,
      },
      "Comment deleted by admin successfully"
    )
  );
});

const deleteUserAccount = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  if (!hasAdminAccess(req)) {
    throw new ApiError(403, "Only admin can delete users");
  }

  const targetUser = await User.findById(userId).select("_id fullName username email role");
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  const targetRole = String(targetUser.role || "").trim().toLowerCase();
  if (["admin", "superadmin"].includes(targetRole)) {
    throw new ApiError(400, "Admin accounts cannot be deleted from the user list");
  }

  if (String(req.user?._id) === String(targetUser._id)) {
    throw new ApiError(400, "You cannot delete your own account from here");
  }

  const ownedPostIds = await Post.find({ owner: userId }).distinct("_id");
  const commentIdsOnOwnedPosts = ownedPostIds.length
    ? await Comment.find({ post: { $in: ownedPostIds } }).distinct("_id")
    : [];
  const userCommentIds = await Comment.find({ owner: userId }).distinct("_id");

  const commentIdsToDelete = [...new Set([...commentIdsOnOwnedPosts, ...userCommentIds].map(String))];

  await Like.deleteMany({
    $or: [
      { user: userId },
      ...(ownedPostIds.length ? [{ post: { $in: ownedPostIds } }] : []),
      ...(commentIdsToDelete.length ? [{ comment: { $in: commentIdsToDelete } }] : []),
    ],
  });

  await Comment.deleteMany({
    $or: [
      { owner: userId },
      ...(ownedPostIds.length ? [{ post: { $in: ownedPostIds } }] : []),
    ],
  });

  await Post.deleteMany({ owner: userId });
  await Subscription.deleteMany({ $or: [{ subscriber: userId }, { channel: userId }] });
  await User.findByIdAndDelete(userId);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        deletedUserId: targetUser._id,
        deletedUserName: targetUser.fullName || targetUser.username || "User",
      },
      "User deleted successfully"
    )
  );
});

const getModerationLogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ModerationLog.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "admin",
          foreignField: "_id",
          as: "adminUser",
        },
      },
      { $unwind: { path: "$adminUser", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          action: 1,
          targetType: 1,
          targetId: 1,
          reason: 1,
          snapshot: 1,
          createdAt: 1,
          admin: {
            _id: "$adminUser._id",
            username: "$adminUser.username",
            fullName: "$adminUser.fullName",
            email: "$adminUser.email",
          },
        },
      },
    ]),
    ModerationLog.countDocuments({}),
  ]);

  return res
    .status(200)
    .set("X-Page", String(page))
    .set("X-Limit", String(limit))
    .set("X-Total-Count", String(total))
    .set("X-Total-Pages", String(Math.ceil(total / limit) || 1))
    .json(new ApiResponse(200, logs, "Moderation logs fetched successfully"));
});

export {
  getPendingAuthorApplications,
  reviewAuthorApplication,
  approveAuthorApplication,
  getAdminUsers,
  getAdminUserProfile,
  getAdminDashboard,
  getAdminProfile,
  updateAdminProfile,
  deleteAnyPost,
  deleteAnyComment,
  deleteUserAccount,
  getModerationLogs,
};
