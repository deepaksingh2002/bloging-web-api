/**
 * File: D:/Fs/Blog/backend/src/controllers/post.controller.js
 * Purpose: Post domain handlers for create/read/update/delete and search APIs.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import mongoose from "mongoose";

/**
 * Create a new post with thumbnail upload.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const createPost = asyncHandler(async (req, res) => {
  const { title, content, catagry } = req.body;
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }
  if (!title || !content) {
    throw new ApiError(400, "Title and content are required");
  }
  if (!req.file?.path) {
    throw new ApiError(400, "Thumbnail is required");
  }
  const allowedCategories = [
    "Tech",
    "Technology",
    "Health",
    "Science",
    "Sports",
    "Entertainment",
  ];
  if (catagry && !allowedCategories.includes(catagry)) {
    throw new ApiError(400, "Invalid category");
  }
  const thumbnailLocalPath = req.file.path;

  let thumbnailUpload;

  try {
    thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnailUpload?.url) {
      throw new ApiError(500, "Thumbnail upload failed");
    }
    const post = await Post.create({
      title,
      content,
      catagry,
      thumbnail: thumbnailUpload.url,
      owner: req.user._id,
    });

    return res.status(201).json(
      new ApiResponse(201, post, "Post created successfully")
    );
  } catch (error) {
    throw new ApiError(500, "post is not created.");
  } finally {
    if (thumbnailLocalPath) {
      await fs.promises.unlink(thumbnailLocalPath).catch(() => {});
    }
  }
});

/**
 * Fetch all posts for feed/list screens.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find()
    .select("title thumbnail owner createdAt views")
    .populate("owner", "username")
    .sort({ createdAt: -1 })
    .lean();
  if (!posts.length) {
    throw new ApiError(404, "No posts found");
  }

  return res.status(200).json(
    new ApiResponse(200, posts, "Posts fetched successfully")
  );
});

/**
 * Search posts by title/content and optional category filter.
 * Query params: q (required), catagry (optional).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const searchPosts = asyncHandler(async (req, res) => {
  const { q, catagry } = req.query;

  if (!q || !q.trim()) {
    throw new ApiError(400, "Search query 'q' is required");
  }

  const query = {
    $or: [
      { title: { $regex: q.trim(), $options: "i" } },
      { content: { $regex: q.trim(), $options: "i" } },
    ],
  };

  if (catagry && catagry.trim()) {
    query.catagry = catagry.trim();
  }

  const posts = await Post.find(query)
    .select("title thumbnail content catagry owner createdAt views")
    .populate("owner", "username")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(200, posts, "Search results fetched successfully")
  );
});

/**
 * Fetch a single post by id.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid Post ID");
  }

  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { views: 1 } },
    { new: true }
  )
    .populate("owner", "username")
    .lean();
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  return res.status(200).json(
    new ApiResponse(200, post, "Post fetched successfully")
  );
});

/**
 * Delete a post by id.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findByIdAndDelete(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Post deleted successfully")
  );
});

/**
 * Update post content and optionally replace thumbnail.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const updatePost = asyncHandler(async (req, res) => {
  const { title, content, catagry } = req.body;
  const { postId } = req.params;

  const existingPost = await Post.findById(postId);
  if (!existingPost) {
    throw new ApiError(404, "Post not found");
  }

  let thumbnailUrl = existingPost.thumbnail;

  if (req.file?.path) {
    const uploaded = await uploadOnCloudinary(req.file.path);

    if (!uploaded?.url) {
      throw new ApiError(500, "Thumbnail upload failed");
    }

    thumbnailUrl = uploaded.url;

    await fs.promises.unlink(req.file.path);

    if (existingPost.thumbnail) {
      const publicId = extractPublicId(existingPost.thumbnail);
      await deleteFromCloudinary(publicId);
    }
  }

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      title: title ?? existingPost.title,
      content: content ?? existingPost.content,
      catagry: catagry ?? existingPost.catagry,
      thumbnail: thumbnailUrl,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedPost, "Post updated successfully")
  );
});

export { createPost, getPosts, searchPosts, getPostById, deletePost, updatePost };
