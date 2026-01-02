import { asyncHandler } from "../utils/asyncHandler.js";
import { Post } from "../models/post.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, deleteFromCloudinary, extractPublicId } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import mongoose from "mongoose";

const createPost = asyncHandler(async (req, res) => {
    const { title, content, catagry } = req.body;

    if (!title || !content) {
        throw new ApiError(400, "All fields are required");
    }

    const thumbnailLocalPath = req.file?.path;
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

    await fs.promises.unlink(thumbnailLocalPath);

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
    const posts = await Post.find()
        .select("title thumbnail owner createdAt likes")
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


const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(postId)){
        throw new ApiError(400, "Invalid Post ID");
    }

    const post = await Post.findById(postId)
        .populate("owner", "username")
        .lean();
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

    // If thumbnail is updated
    if (req.file?.path) {
        const uploaded = await uploadOnCloudinary(req.file.path);

        if (!uploaded?.url) {
            throw new ApiError(500, "Thumbnail upload failed");
        }

        thumbnailUrl = uploaded.url;

        // delete temp file
        await fs.promises.unlink(req.file.path);

        // delete old thumbnail from cloudinary
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
            thumbnail: thumbnailUrl
        },
        {
            new: true,
            runValidators: true
        }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedPost, "Post updated successfully")
    );
});







export { createPost, getPosts, getPostById, deletePost, updatePost };
