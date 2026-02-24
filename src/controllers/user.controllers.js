/**
 * File: D:/Fs/Blog/backend/src/controllers/user.controllers.js
 * Purpose: Authentication and session handlers for user accounts.
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { getCookieOptions } from "../utils/authCookies.js";
import jwt from "jsonwebtoken";

const getTokenStatus = (token, secret) => {
  if (!token) return { present: false, status: "missing" };

  try {
    const decoded = jwt.verify(token, secret);
    return {
      present: true,
      status: "valid",
      userId: decoded?._id || null,
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
    };
  } catch (error) {
    return {
      present: true,
      status: error?.name === "TokenExpiredError" ? "expired" : "invalid",
      error: error?.message || "Token verification failed",
    };
  }
};

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

  const options = getCookieOptions(req);

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

  const options = getCookieOptions(req);

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

  const options = getCookieOptions(req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({ success: true });
});

/**
 * Debug endpoint to inspect current auth/session token state.
 * Disabled in production for safety.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const getSessionDebug = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Session debug endpoint is disabled in production");
  }

  const headerToken = req
    .header("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    ?.trim();
  const accessToken = req.cookies?.accessToken || headerToken;
  const refreshToken = req.cookies?.refreshToken;

  const access = getTokenStatus(accessToken, process.env.ACCESS_TOKEN_SECRET);
  const refresh = getTokenStatus(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  let refreshMatchesDatabase = false;
  let refreshUser = null;

  if (refresh.status === "valid" && refresh.userId) {
    const user = await User.findById(refresh.userId).select("_id email username refreshToken");
    refreshMatchesDatabase = Boolean(user && user.refreshToken === refreshToken);
    if (user) {
      refreshUser = {
        _id: user._id,
        email: user.email,
        username: user.username,
      };
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        checkedAt: new Date().toISOString(),
        cookies: {
          hasAccessTokenCookie: Boolean(req.cookies?.accessToken),
          hasRefreshTokenCookie: Boolean(req.cookies?.refreshToken),
        },
        accessToken: access,
        refreshToken: {
          ...refresh,
          matchesDatabase: refreshMatchesDatabase,
          user: refreshUser,
        },
      },
      "Session debug details fetched successfully"
    )
  );
});

export {
  registerUser,
  logInUser,
  logOutUser,
  getCurrentUser,
  refreshAccessToken,
  getSessionDebug,
};
