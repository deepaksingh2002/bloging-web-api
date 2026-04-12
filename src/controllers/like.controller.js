import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/likes.model.js";
import { Comment } from "../models/comment.model.js";
import mongoose from "mongoose";

const extractEntityId = (req, entity) =>
  req.params?.[`${entity}Id`] ||
  req.body?.[`${entity}Id`] ||
  req.body?.[entity] ||
  req.query?.[`${entity}Id`] ||
  req.query?.[entity];

const assertEntityExists = async (Model, id, entityLabel) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${entityLabel} id`);
  }

  const exists = await Model.exists({ _id: id });
  if (!exists) {
    throw new ApiError(404, `${entityLabel} not found`);
  }
};

const toggleLikeForTarget = async ({
  req,
  res,
  targetField,
  targetId,
  successLabel,
}) => {
  const userId = req.user._id;
  const query = { [targetField]: targetId, user: userId };

  const deletedLike = await Like.findOneAndDelete(query);
  if (deletedLike) {
    const likesCount = await Like.countDocuments({ [targetField]: targetId });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { liked: false, likesCount },
          `${successLabel} unliked successfully`
        )
      );
  }

  try {
    await Like.create({ [targetField]: targetId, user: userId });
  } catch (error) {
    // Concurrent requests can race into duplicate-key errors; treat as idempotent like.
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const likesCount = await Like.countDocuments({ [targetField]: targetId });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { liked: true, likesCount },
        `${successLabel} liked successfully`
      )
    );
};

/**
 * Toggle like state for a post.
 */
const togglePostLike = asyncHandler(async (req, res) => {
  const postId = extractEntityId(req, "post");

  await assertEntityExists(Post, postId, "Post");

  return toggleLikeForTarget({
    req,
    res,
    targetField: "post",
    targetId: postId,
    successLabel: "Post",
  });
});

/**
 * Toggle like state for a comment.
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const commentId = extractEntityId(req, "comment");

  await assertEntityExists(Comment, commentId, "Comment");

  return toggleLikeForTarget({
    req,
    res,
    targetField: "comment",
    targetId: commentId,
    successLabel: "Comment",
  });
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

  const seenPostIds = new Set();
  const posts = likedPosts
    .map((like) => like.post)
    .filter(Boolean)
    .filter((post) => {
      // Keep only first occurrence for any pre-existing duplicate records.
      const postId = String(post._id);
      if (seenPostIds.has(postId)) {
        return false;
      }
      seenPostIds.add(postId);
      return true;
    });

  return res.status(200).json(
    new ApiResponse(
      200,
      posts,
      "Liked posts fetched successfully"
    )
  );
});

export { togglePostLike, toggleCommentLike, getLikedPosts };
