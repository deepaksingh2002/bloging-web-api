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
import mongoose from "mongoose";

/**
 * Toggle like state for a post.
 */
const togglePostLike = asyncHandler(async (req, res) => {
  const postId =
    req.params?.postId ||
    req.body?.postId ||
    req.body?.post ||
    req.query?.postId ||
    req.query?.post;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const deletedLike = await Like.findOneAndDelete({ post: postId, user: userId });
  if (deletedLike) {
    const likesCount = await Like.countDocuments({ post: postId });
    return res.status(200).json(
      new ApiResponse(
        200,
        { liked: false, likesCount },
        "Post unliked successfully"
      )
    );
  }

  try {
    const newLike = new Like({
      post: postId,
      user: userId,
    });
    await newLike.save();
  } catch (error) {
    // Concurrent requests can race into duplicate-key errors; treat as idempotent like.
    if (error?.code !== 11000) {
      throw error;
    }
  }
  const likesCount = await Like.countDocuments({ post: postId });

  return res.status(200).json(
    new ApiResponse(200, { liked: true, likesCount }, "Post liked successfully")
  );
});

/**
 * Toggle like state for a comment.
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const commentId =
    req.params?.commentId ||
    req.body?.commentId ||
    req.body?.comment ||
    req.query?.commentId ||
    req.query?.comment;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const deletedLike = await Like.findOneAndDelete({
    comment: commentId,
    user: userId,
  });
  if (deletedLike) {
    const likesCount = await Like.countDocuments({ comment: commentId });
    return res.status(200).json(
      new ApiResponse(
        200,
        { liked: false, likesCount },
        "Comment unliked successfully"
      )
    );
  }

  try {
    const newLike = new Like({
      comment: commentId,
      user: userId,
    });
    await newLike.save();
  } catch (error) {
    // Concurrent requests can race into duplicate-key errors; treat as idempotent like.
    if (error?.code !== 11000) {
      throw error;
    }
  }
  const likesCount = await Like.countDocuments({ comment: commentId });

  return res.status(200).json(
    new ApiResponse(
      200,
      { liked: true, likesCount },
      "Comment liked successfully"
    )
  );
});

/**
 * Return posts liked by the current user.
 */
const getLikedPosts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likedPosts = await Like.find({ user: userId, post: { $ne: null } })
    .populate({
      path: "post",
      select: "title thumbnail catagry owner createdAt",
      populate: {
        path: "owner",
        select: "username fullName",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  const posts = likedPosts
    .map((like) => like.post)
    .filter(Boolean)
    .filter(
      (post, index, arr) =>
        arr.findIndex((p) => String(p._id) === String(post._id)) === index
    );

  return res.status(200).json(
    new ApiResponse(
      200,
      posts,
      "Liked posts fetched successfully"
    )
  );
});

export { togglePostLike, toggleCommentLike, getLikedPosts };
