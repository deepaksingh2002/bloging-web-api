/**
 * File: D:/Fs/Blog/backend/src/controllers/profile.controller.js
 * Purpose: Profile management handlers for authenticated users.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

/**
 * Return current user's profile and authored posts.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const userProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const posts = await Post.find({ owner: req.user._id })
    .sort({ createdAt: -1 })
    .select("title thumbnail catagry views isPublished createdAt updatedAt owner");

  return res.status(200).json(
    new ApiResponse(200, { user, posts }, "User profile fetched successfully")
  );
});

/**
 * Update editable profile fields (fullName, bio).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, bio } = req.body;

  const updatedData = {};
  if (fullName !== undefined) updatedData.fullName = fullName;
  if (bio !== undefined) updatedData.bio = bio;

  if (Object.keys(updatedData).length === 0) {
    throw new ApiError(400, "At least one field is required to update profile");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updatedData },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "User profile updated successfully")
  );
});

/**
 * Upload and replace user's avatar image.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(500, "Error while uploading avatar");
  }

  await fs.promises.unlink(avatarLocalPath);

  if (user.avatar) {
    const publicId = user.avatar.split("/").pop().split(".")[0];
    await deleteFromCloudinary(publicId);
  }

  user.avatar = avatar.url;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, user, "Avatar updated successfully")
  );
});

/**
 * Change password after validating current password.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const changeUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current and new passwords are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isCurrentPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters long");
  }

  user.password = newPassword;
  await user.save();

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully")
  );
});

export {
  userProfile,
  updateUserProfile,
  updateUserAvatar,
  changeUserPassword,
};
