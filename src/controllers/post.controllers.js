import {asyncHandler} from "../utils/asyncHandler";
import { Post  } from "../moduls/post.model";
import { ApiError } from "../utils/ApiError";
import { uploadOnCloudinary } from "../utils/cloudnary";
import { ApiResponse } from "../utils/ApiResponse";

const createPost = asyncHandler(async (req, res) => {
    const { title, thumbnill, content, catagry } = req.body;

    if (!title || !thumbnill || !content) {
        throw new ApiError(404, "All fields are required");
    }

    const thumbnillLocalPath = req.files?.thumbnill[0]?.path;
    if (!thumbnillLocalPath){
        throw new ApiError(404, "Thumbnail is required");
    }
    if (catagry && !["Technology", "Health", "Science", "Sports", "Entertainment"].includes(catagry)) {
        throw new ApiError(400, "Invalid category");

    }
    const thumbnillUpload = await uploadOnCloudinary(thumbnillLocalPath);
    if (!thumbnillUpload) {
        throw new ApiError(500, "Error while uploading thumbnail");
    }   

    const post = await Post.create({
        title,
        thumbnill: thumbnillUpload.url,
        content,
        catagry,
        owner: req.user._id
    })
    res.status(201).json(
        new ApiResponse(201, post, "Post created successfully")
    );
});



const getPosts = asyncHandler(async (req, res) => {
    const posts = await Post.find().populate("owner", "username");
    res.status(200).json(
        new ApiResponse(200, posts, "get all posts successfully")
    );
});

const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate("owner", "username");
    if (!post) {
        throw new ApiError(404, "Post not found");
    }
    res.status(200).json(
        new ApiResponse(200, post, "get post by id successfully")
    );
});



export { createPost, getPosts, getPostById };