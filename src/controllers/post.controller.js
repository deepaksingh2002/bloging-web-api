import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import mongoose from "mongoose";

const createPost = asyncHandler(async (req, res) => {
    const { title, content, catagry } = req.body;

    if (!title || !content) {
        throw new ApiError(400, "All fields are required");
    }

    const thumbnailLocalPath = req.file?.buffer;
    // console.log("thumbnailLocalPath::", thumbnailLocalPath)
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    if (catagry && !["Tech","Technology", "Health", "Science", "Sports", "Entertainment"].includes(catagry)) {
        throw new ApiError(400, "Invalid category");
    }

    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailUpload?.url) {
        throw new ApiError(500, "Thumbnail upload failed");
    }

    //await fs.promises.unlink(thumbnailLocalPath);

    const post = await Post.create({
        title,
        thumbnail: thumbnailUpload.url,
        content,
        catagry,
        owner: req.user._id
    });

    return res.status(201).json(
        new ApiResponse(201, post, "Post created successfully")
    );
});

const getPosts = asyncHandler(async (req, res) => {
    const posts = await Post.find().populate("owner", "username");
    if (!posts.length) {
        throw new ApiError(404, "No posts found");
    }

    return res.status(200).json(
        new ApiResponse(200, posts, "Posts fetched successfully")
    );
});


const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(postId)){
        throw new ApiError(400, "Invalid Post ID");
    }

    const post = await Post.findById(postId).populate("owner", "username");
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    return res.status(200).json(
        new ApiResponse(200, post, "Post fetched successfully")
    );
});


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

const updatePost = asyncHandler(async (req, res) => {
    const { title, content, catagry } = req.body;
    const { postId } = req.params;

    const existingPost = await Post.findById(postId);
    if (!existingPost) {
        throw new ApiError(404, "Post not found");
    }

    let thumbnailUrl = existingPost.thumbnail;

    if (req.file?.buffer) { 
        const thumbnailPath = req.file?.buffer; 
        const uploaded = await uploadOnCloudinary(thumbnailPath);

        if (uploaded?.url) thumbnailUrl = uploaded.url;

        if (fs.existsSync(thumbnailPath)) {
            await fs.promises.unlink(thumbnailPath);
        }
    }

    const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
            title: title || existingPost.title,
            thumbnail: thumbnailUrl,
            content: content || existingPost.content,
            catagry: catagry || existingPost.catagry
        },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedPost, "Post updated successfully")
    );
});
const toggleLikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, "Post not found");

  const liked = post.likes.includes(userId);

  if (liked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
  }

  await post.save();

  return res.status(200).json(
    new ApiResponse(200, post.likes, liked ? "Unliked" : "Liked")
  );
});


export { createPost, getPosts, getPostById, deletePost, updatePost, toggleLikePost, };
