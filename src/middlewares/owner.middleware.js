import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const normalize = (value) => String(value || "").trim().toLowerCase();

export const verifyOwnerAccess = asyncHandler(async (req, _res, next) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  const userRole = req.user?.role;
  const isAdmin = typeof userRole === "string" && userRole.toLowerCase() === "admin";
  if (isAdmin) {
    return next();
  }

  const ownerEmail = normalize(process.env.OWNER_EMAIL);
  const ownerUserId = String(process.env.OWNER_USER_ID || "").trim();

  const matchesOwnerEmail = ownerEmail && normalize(req.user.email) === ownerEmail;
  const matchesOwnerId =
    ownerUserId &&
    mongoose.Types.ObjectId.isValid(ownerUserId) &&
    String(req.user._id) === ownerUserId;

  if (matchesOwnerEmail || matchesOwnerId) {
    return next();
  }

  throw new ApiError(403, "Only owner/admin can perform this action");
});
