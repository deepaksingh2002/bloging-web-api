import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import mongoose from "mongoose";

const attachEngagementCounts = async (posts, userId = null) => {
  const ids = posts.map((post) => post?._id).filter(Boolean);
  if (!ids.length) return posts;

  const [likeCounts, commentCounts, likedByCurrentUser] = await Promise.all([
    Like.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    Comment.aggregate([
      { $match: { post: { $in: ids } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
    userId
      ? Like.find({ post: { $in: ids }, user: userId }).select("post").lean()
      : Promise.resolve([]),
  ]);

  const likesByPostId = new Map(likeCounts.map((entry) => [String(entry._id), entry.count]));
  const commentsByPostId = new Map(commentCounts.map((entry) => [String(entry._id), entry.count]));
  const likedPostIds = new Set((likedByCurrentUser || []).map((entry) => String(entry.post)));

  return posts.map((post) => ({
    ...post,
    likesCount: likesByPostId.get(String(post._id)) || 0,
    commentsCount: commentsByPostId.get(String(post._id)) || 0,
    isLiked: likedPostIds.has(String(post._id)),
  }));
};

const ensurePostOwnership = (post, userId) => {
  if (String(post.owner) !== String(userId)) {
    throw new ApiError(403, "You are not allowed to modify this post");
  }
};

/**
 * Create a new post with thumbnail upload.
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

  const postsWithCounts = await attachEngagementCounts(posts, req.user?._id || null);

  return res.status(200).json(
    new ApiResponse(200, postsWithCounts, "Posts fetched successfully")
  );
});

/**
 * Search posts by title/content and optional category filter.
 * Query params: q (required), catagry (optional).
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

  const postsWithCounts = await attachEngagementCounts(posts, req.user?._id || null);

  return res.status(200).json(
    new ApiResponse(200, postsWithCounts, "Search results fetched successfully")
  );
});

/**
 * Fetch a single post by id.
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

  const [postWithCounts] = await attachEngagementCounts([post], req.user?._id || null);

  return res.status(200).json(
    new ApiResponse(200, postWithCounts, "Post fetched successfully")
  );
});

/**
 * Delete a post by id.
 */
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid Post ID");
  }

  const post = await Post.findById(postId).select("_id owner");
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  ensurePostOwnership(post, req.user?._id);

  const commentIds = await Comment.distinct("_id", { post: postId });

  if (commentIds.length) {
    await Like.deleteMany({ comment: { $in: commentIds } });
    await Comment.deleteMany({ post: postId });
  }

  await Like.deleteMany({ post: postId });
  await Post.findByIdAndDelete(postId);

  return res.status(200).json(
    new ApiResponse(200, null, "Post deleted successfully")
  );
});

/**
 * Update post content and optionally replace thumbnail.
 */
const updatePost = asyncHandler(async (req, res) => {
  const { title, content, catagry } = req.body;
  const { postId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, "Invalid Post ID");
  }

  const existingPost = await Post.findById(postId);
  if (!existingPost) {
    throw new ApiError(404, "Post not found");
  }

  ensurePostOwnership(existingPost, req.user?._id);

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
