/**
 * File: D:/Fs/Blog/backend/src/controllers/user.controllers.js
 * Purpose: Authentication and session handlers for user accounts.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

/**
 * Generate and persist access/refresh tokens for a user.
 * @param {string} userId
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error.message || "Error while generating tokens");
  }
};

/**
 * Register a new user and auto-generate a unique username from email.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if ([fullName, email, password].some((f) => !f || f.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  if (password?.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!regex.test(password)) {
    throw new ApiError(
      400,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
  }

  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  const baseUsername = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let username = baseUsername;
  let isUsernameUnique = false;
  let counter = 1;

  while (!isUsernameUnique) {
    const userWithUsername = await User.findOne({ username });
    if (!userWithUsername) {
      isUsernameUnique = true;
    } else {
      username = `${baseUsername}${counter}`;
      counter++;
    }
  }

  const user = await User.create({ fullName, email, password, username });
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

/**
 * Authenticate user credentials and set token cookies.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const logInUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "Email or Username is required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) throw new ApiError(404, "User not found");

  const valid = await user.isPasswordCorrect(password);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { user: loggedInUser }, "Logged in successfully"));
});

/**
 * Clear user refresh token and remove auth cookies.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

/**
 * Return the currently authenticated user payload.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

/**
 * Validate refresh token and rotate access/refresh tokens.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Refresh token expired or invalid");
  }

  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({ success: true });
});

export {
  registerUser,
  logInUser,
  logOutUser,
  getCurrentUser,
  refreshAccessToken,
};
