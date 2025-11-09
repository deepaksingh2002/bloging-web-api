import {asyncHandler} from "../utils/asyncHandler";
import { Post  } from "../moduls/post.model";
import { ApiError } from "../utils/ApiError";
import { uploadOnCloudinary } from "../utils/cloudnary";
import { ApiResponse } from "../utils/ApiResponse";
import fs from "fs";
import { fileURLToPath } from "url";

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
    });
    await fs.promises.unlink(thumbnillLocalPath);

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


// const getAllPost = asyncHandler(async (req, res) => {
//   const {
//     limit = 10,
//     page = 1,
//     query,
//     sortBy = "createdAt",
//     sortType = "desc",
//     userId,
//   } = req.query;

//   // convert pagination inputs
//   const pageNumber = Math.max(parseInt(page, 10), 1);
//   const limitNumber = Math.max(parseInt(limit, 10), 1);
//   const skip = (pageNumber - 1) * limitNumber;

//   // build filter query
//   const filter = {};

//   if (query) {
//     // match title or content (case-insensitive)
//     filter.$or = [
//       { title: { $regex: query, $options: "i" } },
//       { content: { $regex: query, $options: "i" } },
//     ];
//   }

//   if (userId) {
//     filter.userId = userId;
//   }

//   // build sort options
//   const sortOptions = {};
//   sortOptions[sortBy] = sortType === "asc" ? 1 : -1;

//   // fetch posts
//   const posts = await Post.find(filter)
//     .sort(sortOptions)
//     .skip(skip)
//     .limit(limitNumber)
//     .populate("userId", "username email"); // optional populate user

//   const totalPosts = await Post.countDocuments(filter);
//   const totalPages = Math.ceil(totalPosts / limitNumber);

//   if (!posts.length) {
//     throw new ApiError(404, "Posts not found");
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, {
//         posts,
//         pagination: {
//           totalPosts,
//           totalPages,
//           currentPage: pageNumber,
//           limit: limitNumber,
//         },
//       }, "Posts fetched successfully")
//     );
// });


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


const deletePost = asyncHandler(async (req, res) => {
    const {postId} = req.params;
    if (!postId) {
        throw new ApiError(404, "Post ID is required");
    }
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    } 
    res.status(200).json(
        new ApiResponse(200,"Post deleted successfully")
    );
});

const updatePost = asyncHandler(async (req, res) => {
  const { title, content, catagry } = req.body;
  const { postId } = req.params;

  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }

  // Step 1: Check existing post
  const existingPost = await Post.findById(postId);
  if (!existingPost) {
    throw new ApiError(404, "Post not found");
  }

  // Step 2: Handle thumbnail upload (via Multer)
  let thumbnailPath = existingPost.thumbnill;
  let thumbnailUrl = existingPost.thumbnill;

  if (req.files && req.files.thumbnill && req.files.thumbnill[0]) {
    thumbnailPath = req.files.thumbnill[0].path;

    // Upload to Cloudinary
    const uploadResponse = await uploadOnCloudinary(thumbnailPath);
    if (!uploadResponse || !uploadResponse.url) {
      throw new ApiError(500, "Error while uploading thumbnail to Cloudinary");
    }

    thumbnailUrl = uploadResponse.url;

    // Delete local file safely (await ensures it completes)
    if (fs.existsSync(thumbnailPath)) {
      await fs.promises.unlink(thumbnailPath);
    }

    // Delete old local thumbnail
    if (existingPost.thumbnill && fs.existsSync(existingPost.thumbnill)) {
      await fs.promises.unlink(existingPost.thumbnill);
    }
  }

  // Step 3: Update post fields
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      title: title || existingPost.title,
      thumbnill: thumbnailUrl,
      content: content || existingPost.content,
      catagry: catagry || existingPost.catagry,
    },
    { new: true, runValidators: true }
  );

  if (!updatedPost) {
    throw new ApiError(500, "Failed to update post");
  }

  // Step 4: Send success response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post updated successfully"));
});

    



export { createPost, getPosts, getPostById, deletePost, updatePost };