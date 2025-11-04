import {asyncHandler} from "../utils/asyncHandler";
import { Post  } from "../moduls/post.model";
import { ApiError } from "../utils/ApiError";
import { uploadOnCloudinary } from "../utils/cloudnary";

const createPost = asyncHandler(async (req, res) => {
    const { title, thumbnill, content, catagry } = req.body;

    if (!title || !thumbnill || !content) {
        res.status(400);
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
    res.status(201).json({
        success: true,
        post
    });
});



const getPosts = asyncHandler(async (req, res) => {
    const posts = await Post.find().populate("owner", "username");
    res.status(200).json({
        success:true,
        posts
    });
});


export { createPost, getPosts  };