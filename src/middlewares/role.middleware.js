import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { matchesOwnerIdentity } from "./owner.middleware.js";

const normalizeRoles = (roles) =>
  roles.map((role) => String(role || "").trim().toLowerCase()).filter(Boolean);

const requireRoles = (...allowedRoles) => {
  const normalizedAllowedRoles = normalizeRoles(allowedRoles);

  return asyncHandler(async (req, _res, next) => {
    if (!req.user?._id) {
      throw new ApiError(401, "Unauthorized");
    }

    const userRole = String(req.user?.role || "").trim().toLowerCase();
    if (!normalizedAllowedRoles.includes(userRole)) {
      throw new ApiError(403, "You are not allowed to perform this action");
    }

    return next();
  });
};

const hasAdminAccess = (req) => {
  const userRole = String(req.user?.role || "").trim().toLowerCase();
  return userRole === "admin" || matchesOwnerIdentity(req);
};

const requireAdmin = asyncHandler(async (req, _res, next) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized");
  }

  if (hasAdminAccess(req)) {
    return next();
  }

  throw new ApiError(403, "You are not allowed to perform this action");
});

const requireAuthor = requireRoles("author");

export { requireRoles, requireAdmin, requireAuthor, hasAdminAccess };
