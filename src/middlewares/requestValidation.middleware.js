import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const getTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const validateRegisterPayload = (req, _res, next) => {
  const fullName = getTrimmedString(req.body?.fullName);
  const email = getTrimmedString(req.body?.email).toLowerCase();
  const password = String(req.body?.password || "");

  if (!fullName || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  if (password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long");
  }

  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!strongPasswordRegex.test(password)) {
    throw new ApiError(
      400,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
  }

  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(email)) {
    throw new ApiError(400, "Valid email is required");
  }

  req.body.fullName = fullName;
  req.body.email = email;
  req.body.password = password;

  return next();
};

const validateLoginPayload = (req, _res, next) => {
  const email = getTrimmedString(req.body?.email).toLowerCase();
  const username = getTrimmedString(req.body?.username).toLowerCase();
  const password = String(req.body?.password || "");

  if (!email && !username) {
    throw new ApiError(400, "Email or Username is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  if (email) {
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(email)) {
      throw new ApiError(400, "Valid email is required");
    }
  }

  req.body.email = email;
  req.body.username = username;
  req.body.password = password;

  return next();
};

const validateAuthorApplicationPayload = (req, _res, next) => {
  const { bio, expertise, portfolioUrl, motivation } = req.body || {};

  const trimmedMotivation = getTrimmedString(motivation);
  if (!trimmedMotivation) {
    throw new ApiError(400, "Motivation is required");
  }

  const trimmedBio = getTrimmedString(bio);
  if (trimmedBio.length > 500) {
    throw new ApiError(400, "Bio must not exceed 500 characters");
  }

  const trimmedExpertise = getTrimmedString(expertise);
  if (trimmedExpertise.length > 200) {
    throw new ApiError(400, "Expertise must not exceed 200 characters");
  }

  const trimmedPortfolioUrl = getTrimmedString(portfolioUrl);
  if (trimmedPortfolioUrl.length > 0) {
    try {
      new URL(trimmedPortfolioUrl);
    } catch {
      throw new ApiError(400, "Portfolio URL must be a valid URL");
    }
  }

  if (trimmedMotivation.length > 1000) {
    throw new ApiError(400, "Motivation must not exceed 1000 characters");
  }

  req.body.bio = trimmedBio;
  req.body.expertise = trimmedExpertise;
  req.body.portfolioUrl = trimmedPortfolioUrl;
  req.body.motivation = trimmedMotivation;

  return next();
};

const validateAuthorApplicationReviewPayload = (req, _res, next) => {
  const { action, rejectionReason } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(req.params?.userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const normalizedAction = getTrimmedString(action).toLowerCase();
  if (!["approve", "reject"].includes(normalizedAction)) {
    throw new ApiError(400, "Action must be either 'approve' or 'reject'");
  }

  const trimmedRejectionReason = getTrimmedString(rejectionReason);

  if (normalizedAction === "reject" && !trimmedRejectionReason) {
    throw new ApiError(400, "Rejection reason is required when rejecting an application");
  }

  if (trimmedRejectionReason.length > 500) {
    throw new ApiError(400, "Rejection reason must not exceed 500 characters");
  }

  req.body.action = normalizedAction;
  req.body.rejectionReason = trimmedRejectionReason;

  return next();
};

export {
  validateRegisterPayload,
  validateLoginPayload,
  validateAuthorApplicationPayload,
  validateAuthorApplicationReviewPayload,
};
