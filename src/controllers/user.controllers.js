

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import {
  getAccessTokenCookieOptions,
  getBaseCookieOptions,
  getRefreshTokenCookieOptions,
} from "../utils/authCookies.js";
import { matchesOwnerIdentity } from "../middlewares/owner.middleware.js";
import jwt from "jsonwebtoken";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const withAccessFlags = (user) => {
  if (!user) return user;

  const baseUser = typeof user.toObject === "function" ? user.toObject() : { ...user };
  const role = normalizeRole(baseUser.role);
  const isOwner = matchesOwnerIdentity({ user: baseUser });
  const isSuperAdmin = role === "superadmin";
  const isAdmin = role === "admin" || isSuperAdmin || isOwner;
  const isAuthor = role === "author";

  return {
    ...baseUser,
    isOwner,
    isAdmin,
    isSuperAdmin,
    isAuthor,
  };
};

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

  const accessCookieOptions = getAccessTokenCookieOptions(req);
  const refreshCookieOptions = getRefreshTokenCookieOptions(req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(new ApiResponse(200, { user: withAccessFlags(loggedInUser) }, "Logged in successfully"));
});

/**
 * Clear user refresh token and remove auth cookies.
 */
const logOutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $unset: {
          refreshToken: 1,
        },
      },
      { new: true }
    );
  } else if (incomingRefreshToken) {
    try {
      const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      await User.findByIdAndUpdate(
        decoded?._id,
        {
          $unset: {
            refreshToken: 1,
          },
        },
        { new: true }
      );
    } catch {
      // Best-effort logout: always clear cookies even if refresh token is invalid.
    }
  }

  const options = getBaseCookieOptions(req);

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

/**
 * Return the currently authenticated user payload.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, withAccessFlags(req.user), "Current user fetched successfully"));
});

/**
 * Submit author application form for the logged-in user.
 */
const applyForAuthor = asyncHandler(async (req, res) => {
  const { bio, expertise, portfolioUrl, motivation } = req.body;

  if (!motivation || !String(motivation).trim()) {
    throw new ApiError(400, "Motivation is required");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "author") {
    throw new ApiError(400, "You are already an author");
  }

  if (user.role === "admin" || user.role === "superadmin") {
    throw new ApiError(400, "Admin account cannot apply for author role");
  }

  if (user.authorApplication?.status === "pending") {
    throw new ApiError(409, "Author application already pending");
  }

  user.authorApplication = {
    status: "pending",
    bio: bio?.trim() || "",
    expertise: expertise?.trim() || "",
    portfolioUrl: portfolioUrl?.trim() || "",
    motivation: motivation.trim(),
    appliedAt: new Date(),
    reviewedAt: undefined,
    reviewedBy: undefined,
    rejectionReason: "",
  };

  await user.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { authorApplication: user.authorApplication },
      "Author application submitted successfully"
    )
  );
});

/**
 * Validate refresh token and rotate access/refresh tokens.
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

  // Keep refresh token stable for the session and rotate only access token here.
  // This avoids refresh-token races when multiple client requests refresh together.
  const accessToken = user.generateAccessToken();
  const refreshToken = user.refreshToken;

  const accessCookieOptions = getAccessTokenCookieOptions(req);
  const refreshCookieOptions = getRefreshTokenCookieOptions(req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Access token refreshed successfully"
      )
    );
});

/**
 * Debug endpoint to inspect current auth/session token state.
 * Disabled in production for safety.
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

/**
 * Return author/admin accounts for discovery with follow metadata.
 */
const getAuthorsList = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;

  const authors = await User.find({
    role: { $in: ["author", "admin", "superadmin"] },
  })
    .select("_id username fullName bio avatar role authorApplication.status")
    .sort({ fullName: 1, username: 1 })
    .lean();

  if (!authors.length) {
    return res.status(200).json(new ApiResponse(200, [], "Authors fetched successfully"));
  }

  const authorIds = authors.map((author) => author._id);

  const [followerAgg, myFollowing] = await Promise.all([
    Subscription.aggregate([
      { $match: { channel: { $in: authorIds } } },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]),
    Subscription.find({ subscriber: currentUserId, channel: { $in: authorIds } })
      .select("channel")
      .lean(),
  ]);

  const followersByAuthorId = new Map(
    followerAgg.map((entry) => [String(entry._id), Number(entry.count) || 0])
  );
  const followingAuthorIds = new Set((myFollowing || []).map((entry) => String(entry.channel)));

  const payload = authors.map((author) => ({
    ...author,
    followerCount: followersByAuthorId.get(String(author._id)) || 0,
    isFollowing: followingAuthorIds.has(String(author._id)),
  }));

  return res.status(200).json(
    new ApiResponse(200, payload, "Authors fetched successfully")
  );
});

export {
  registerUser,
  logInUser,
  logOutUser,
  getCurrentUser,
  applyForAuthor,
  refreshAccessToken,
  getSessionDebug,
  getAuthorsList,
};
