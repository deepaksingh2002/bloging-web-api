/**
 * File: D:\Fs\Blog\backend\src\middlewares\auth.middleware.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { getAccessTokenCookieOptions } from "../utils/authCookies.js";

const logAuthFailure = (req, stage, error) => {
  console.warn(`[AUTH] ${stage} failed`, {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    origin: req.get("origin") || null,
    userAgent: req.get("user-agent") || null,
    errorName: error?.name || "UnknownError",
    errorMessage: error?.message || "Unknown auth error",
  });
};

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const headerToken = req
    .header("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    ?.trim();
  const accessToken = req.cookies?.accessToken || headerToken;

  if (accessToken) {
    try {
      const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

      if (user) {
        req.user = user;
        return next();
      }
      logAuthFailure(req, "access-token-user-lookup", new Error("User not found for access token"));
    } catch (error) {
      logAuthFailure(req, "access-token-verify", error);
      // Fall through to refresh token check when access token is invalid/expired.
    }
  }

  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    logAuthFailure(req, "refresh-token-missing", new Error("Refresh token cookie is missing"));
    throw new ApiError(401, "Invalid access token.");
  }

  let decodedRefreshToken;
  try {
    decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    logAuthFailure(req, "refresh-token-verify", error);
    throw new ApiError(401, "Refresh token expired or invalid");
  }

  const user = await User.findById(decodedRefreshToken?._id);
  if (!user || user.refreshToken !== refreshToken) {
    logAuthFailure(req, "refresh-token-database-check", new Error("Refresh token mismatch or user missing"));
    throw new ApiError(401, "Invalid refresh token");
  }

  const newAccessToken = user.generateAccessToken();
  res.cookie("accessToken", newAccessToken, getAccessTokenCookieOptions(req));

  req.user = await User.findById(user._id).select("-password -refreshToken");
  return next();
});
