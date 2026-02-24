/**
 * File: D:/Fs/Blog/backend/src/controllers/like.controller.js
 * Purpose: Like/unlike handlers for posts and comments.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/likes.model.js";
import { Comment } from "../models/comment.model.js";

/**
 * Toggle like state for a post.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const existingLike = await Like.findOne({ post: postId, user: userId });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res.status(200).json(
      new ApiResponse(200, null, "Post unliked successfully")
    );
  }

  const newLike = new Like({
    post: postId,
    user: userId,
  });
  await newLike.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Post liked successfully")
  );
});

/**
 * Toggle like state for a comment.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({ comment: commentId, user: userId });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res.status(200).json(
      new ApiResponse(200, null, "Comment unliked successfully")
    );
  }

  const newLike = new Like({
    comment: commentId,
    user: userId,
  });
  await newLike.save();

  return res.status(200).json(
    new ApiResponse(200, null, "Comment liked successfully")
  );
});

/**
 * Return posts liked by the current user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getLikedPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likedPosts = await Like.find({ user: userId }).populate("post").lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      likedPosts.map((like) => like.post),
      "Liked posts fetched successfully"
    )
  );
});

export { togglePostLike, toggleCommentLike, getLikedPosts };
