import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const normalize = (value) => String(value || "").trim().toLowerCase();

const hasDeveloperMatch = (req) => {
  const ownerEmail = normalize(process.env.OWNER_EMAIL);
  const ownerUserId = String(process.env.OWNER_USER_ID || "").trim();

  const matchesOwnerEmail = ownerEmail && normalize(req.user?.email) === ownerEmail;
  const matchesOwnerId =
    ownerUserId &&
    mongoose.Types.ObjectId.isValid(ownerUserId) &&
    String(req.user?._id) === ownerUserId;

  return Boolean(matchesOwnerEmail || matchesOwnerId);
};

export const verifyOwnerAccess = asyncHandler(async (req, _res, next) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  const userRole = req.user?.role;
  const isAdmin = typeof userRole === "string" && userRole.toLowerCase() === "admin";
  if (isAdmin) {
    return next();
  }

  if (hasDeveloperMatch(req)) {
    return next();
  }

  throw new ApiError(403, "Only owner/admin can perform this action");
});

export const verifyDeveloperAccess = asyncHandler(async (req, _res, next) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  if (hasDeveloperMatch(req)) {
    return next();
  }

  throw new ApiError(403, "Only developer can perform this action");
});
