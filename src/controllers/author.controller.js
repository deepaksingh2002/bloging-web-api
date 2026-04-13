import mongoose from "mongoose";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const firstValue = (arr, key = "count") => (arr?.[0]?.[key] || 0);

const getAuthorDashboard = asyncHandler(async (req, res) => {
  const authorId = new mongoose.Types.ObjectId(req.user._id);

  const [postOverview, postLikesAgg, commentStatsAgg, commentLikesAgg, recentPosts] =
    await Promise.all([
      Post.aggregate([
        { $match: { owner: authorId } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  totalPosts: { $sum: 1 },
                  totalViews: { $sum: "$views" },
                  publishedPosts: {
                    $sum: { $cond: [{ $eq: ["$isPublished", true] }, 1, 0] },
                  },
                },
              },
              { $project: { _id: 0, totalPosts: 1, totalViews: 1, publishedPosts: 1 } },
            ],
            byCategory: [
              { $group: { _id: "$catagry", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $project: { _id: 0, category: "$_id", count: 1 } },
            ],
            topPostsByViews: [
              { $sort: { views: -1, createdAt: -1 } },
              { $limit: 5 },
              {
                $project: {
                  _id: 1,
                  title: 1,
                  catagry: 1,
                  views: 1,
                  isPublished: 1,
                  createdAt: 1,
                },
              },
            ],
          },
        },
      ]),
      Like.aggregate([
        { $match: { post: { $ne: null } } },
        {
          $lookup: {
            from: "posts",
            localField: "post",
            foreignField: "_id",
            as: "postDoc",
          },
        },
        { $unwind: "$postDoc" },
        { $match: { "postDoc.owner": authorId } },
        { $count: "count" },
      ]),
      Comment.aggregate([
        {
          $lookup: {
            from: "posts",
            localField: "post",
            foreignField: "_id",
            as: "postDoc",
          },
        },
        { $unwind: "$postDoc" },
        { $match: { "postDoc.owner": authorId } },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
          },
        },
        { $project: { _id: 0, totalComments: 1 } },
      ]),
      Like.aggregate([
        { $match: { comment: { $ne: null } } },
        {
          $lookup: {
            from: "comments",
            localField: "comment",
            foreignField: "_id",
            as: "commentDoc",
          },
        },
        { $unwind: "$commentDoc" },
        {
          $lookup: {
            from: "posts",
            localField: "commentDoc.post",
            foreignField: "_id",
            as: "postDoc",
          },
        },
        { $unwind: "$postDoc" },
        { $match: { "postDoc.owner": authorId } },
        { $count: "count" },
      ]),
      Post.aggregate([
        { $match: { owner: authorId } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "comments",
            let: { postId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$post", "$$postId"] } } },
              { $count: "count" },
            ],
            as: "commentStats",
          },
        },
        {
          $lookup: {
            from: "likes",
            let: { postId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$post", "$$postId"] }, { $ne: ["$post", null] }],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "likeStats",
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            catagry: 1,
            isPublished: 1,
            views: 1,
            createdAt: 1,
            commentsCount: {
              $ifNull: [{ $arrayElemAt: ["$commentStats.count", 0] }, 0],
            },
            likesCount: {
              $ifNull: [{ $arrayElemAt: ["$likeStats.count", 0] }, 0],
            },
          },
        },
      ]),
    ]);

  const postData = postOverview?.[0] || { totals: [], byCategory: [], topPostsByViews: [] };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts: {
          ...(postData.totals?.[0] || {
            totalPosts: 0,
            totalViews: 0,
            publishedPosts: 0,
          }),
          byCategory: postData.byCategory || [],
          topPostsByViews: postData.topPostsByViews || [],
        },
        engagement: {
          postLikes: firstValue(postLikesAgg),
          commentsOnPosts: firstValue(commentStatsAgg, "totalComments"),
          commentLikesOnPosts: firstValue(commentLikesAgg),
        },
        recentPosts,
      },
      "Author dashboard fetched successfully"
    )
  );
});

const getAuthorProfile = asyncHandler(async (req, res) => {
  const authorId = new mongoose.Types.ObjectId(req.user._id);

  const [authorProfile, recentComments] = await Promise.all([
    User.aggregate([
      { $match: { _id: authorId, role: "author" } },
      {
        $project: {
          _id: 1,
          fullName: 1,
          username: 1,
          email: 1,
          avatar: 1,
          bio: 1,
          role: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]),
    Comment.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "post",
          foreignField: "_id",
          as: "postDoc",
        },
      },
      { $unwind: "$postDoc" },
      { $match: { "postDoc.owner": authorId } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "commenter",
        },
      },
      { $unwind: { path: "$commenter", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          post: {
            _id: "$postDoc._id",
            title: "$postDoc.title",
          },
          commenter: {
            _id: "$commenter._id",
            username: "$commenter.username",
            fullName: "$commenter.fullName",
          },
        },
      },
    ]),
  ]);

  if (!authorProfile?.length) {
    throw new ApiError(404, "Author profile not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        profile: authorProfile[0],
        recentComments,
      },
      "Author profile fetched successfully"
    )
  );
});

const getManagedPosts = asyncHandler(async (req, res) => {
  const authorId = new mongoose.Types.ObjectId(req.user._id);
  const page = Math.max(Number(req.query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.aggregate([
      { $match: { owner: authorId } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "comments",
          let: { postId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$post", "$$postId"] } } },
            { $count: "count" },
          ],
          as: "commentStats",
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$post", "$$postId"] }, { $ne: ["$post", null] }],
                },
              },
            },
            { $count: "count" },
          ],
          as: "likeStats",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          catagry: 1,
          isPublished: 1,
          views: 1,
          createdAt: 1,
          updatedAt: 1,
          commentsCount: {
            $ifNull: [{ $arrayElemAt: ["$commentStats.count", 0] }, 0],
          },
          likesCount: {
            $ifNull: [{ $arrayElemAt: ["$likeStats.count", 0] }, 0],
          },
        },
      },
    ]),
    Post.countDocuments({ owner: authorId }),
  ]);

  return res
    .status(200)
    .set("X-Page", String(page))
    .set("X-Limit", String(limit))
    .set("X-Total-Count", String(total))
    .set("X-Total-Pages", String(Math.ceil(total / limit) || 1))
    .json(new ApiResponse(200, posts, "Author managed posts fetched successfully"));
});

export { getAuthorDashboard, getAuthorProfile, getManagedPosts };
