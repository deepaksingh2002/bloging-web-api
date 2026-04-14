import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/likes.model.js";
import { Report } from "../models/report.model.js";
import { isAdminRole } from "../middlewares/owner.middleware.js";

const ensureCommentOwnerOrAdmin = (commentOwner, user) => {
  const isOwner = String(commentOwner) === String(user?._id);
  if (isOwner || isAdminRole(user?.role)) {
    return;
  }

  throw new ApiError(403, "You are not allowed to modify this comment");
};

/**
 * Create a comment for a post.
 */
const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const post = await Post.findById(postId).select("_id");
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await Comment.create({
    content: content.trim(),
    post: postId,
    owner: req.user._id,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate("owner", "username fullName")
    .lean();

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment created successfully"));
});

/**
 * Get all comments for a post.
 */
const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const page = Math.max(Number(req.query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  const [comments, total] = await Promise.all([
    Comment.find({ post: postId })
      .populate("owner", "username fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments({ post: postId }),
  ]);

  return res
    .set("X-Page", String(page))
    .set("X-Limit", String(limit))
    .set("X-Total-Count", String(total))
    .set("X-Total-Pages", String(Math.ceil(total / limit) || 1))
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

/**
 * Update comment content by owner.
 */
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  ensureCommentOwnerOrAdmin(comment.owner, req.user);

  comment.content = content.trim();
  await comment.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate("owner", "username fullName")
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, populatedComment, "Comment updated successfully"));
});

/**
 * Delete a comment by owner and remove related likes.
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  ensureCommentOwnerOrAdmin(comment.owner, req.user);

  await Comment.findByIdAndDelete(commentId);
  await Like.deleteMany({ comment: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

/**
 * Report a comment for moderation review.
 */
const reportComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const reason = String(req.body?.reason || "").trim();

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId).select("_id post");
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingOpenReport = await Report.findOne({
    reporter: req.user?._id,
    targetType: "comment",
    targetId: comment._id,
    status: "open",
  }).select("_id");

  if (existingOpenReport) {
    return res.status(200).json(
      new ApiResponse(
        200,
        { reportId: existingOpenReport._id, targetType: "comment", targetId: comment._id },
        "Comment already reported"
      )
    );
  }

  const report = await Report.create({
    reporter: req.user?._id,
    targetType: "comment",
    targetId: comment._id,
    post: comment.post || null,
    reason,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      { reportId: report._id, targetType: report.targetType, targetId: report.targetId },
      "Comment reported successfully"
    )
  );
});

export { createComment, getPostComments, updateComment, deleteComment, reportComment };
