/**
 * File: D:/Fs/Blog/backend/src/controllers/comment.controller.js
 * Purpose: Comment handlers for create/read/update/delete flows.
 */

import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/likes.model.js";

/**
 * Create a comment for a post.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const content = req.body?.content ?? req.body?.comment ?? req.body?.text;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  if (!content || !String(content).trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const post = await Post.findById(postId).select("_id");
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = await Comment.create({
    content: String(content).trim(),
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
 * @param {import("express").Request} req
 * @param {import("express").Response} res
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
 * @param {import("express").Request} req
 * @param {import("express").Response} res
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

  if (String(comment.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }

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
 * @param {import("express").Request} req
 * @param {import("express").Response} res
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

  if (String(comment.owner) !== String(req.user._id)) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);
  await Like.deleteMany({ comment: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { createComment, getPostComments, updateComment, deleteComment };
