import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Post from "../models/post.model.js";
import Like from "../models/like.model.js";

const togglePostLike = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const existingLike = await Like.findOne({ post: postId, user: userId });

    if (existingLike) {
        // If like exists, remove it (unlike)
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(
            new ApiResponse(200, null, "Post unliked successfully")
        );
    } else {
        // If like does not exist, create it (like)
        const newLike = new Like({
            post: postId,
            user: userId
        });
        await newLike.save();
        return res.status(200).json(
            new ApiResponse(200, null, "Post liked successfully")
        );
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    // Implementation for toggling comment like
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const existingLike = await Like.findOne({ comment: commentId, user: userId });

    if (existingLike) {
        // If like exists, remove it (unlike)
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(
            new ApiResponse(200, null, "Comment unliked successfully")
        );
    } else {
        // If like does not exist, create it (like)
        const newLike = new Like({
            comment: commentId,
            user: userId
        });
        await newLike.save();
        return res.status(200).json(
            new ApiResponse(200, null, "Comment liked successfully")
        );
    }   
});

const getLikedPosts = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likedPosts = await Like.find({ user: userId }).populate('post');

    return res.status(200).json(
        new ApiResponse(200, likedPosts.map(like => like.post), "Liked posts fetched successfully")
    );
});

export { togglePostLike, toggleCommentLike, getLikedPosts };