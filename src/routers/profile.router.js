/**
 * File: D:\Fs\Blog\backend\src\routers\profile.router.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  userProfile,
  updateUserProfile,
  changeUserPassword,
  updateUserAvatar,
} from "../controllers/profile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireRoles } from "../middlewares/role.middleware.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

const requireNormalUserProfileAccess = (req, _res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();

  if (role === "author") {
    throw new ApiError(403, "Use /api/v1/author/profile for author profile access");
  }

  if (role === "admin") {
    throw new ApiError(403, "Use /api/v1/admin/profile for admin profile access");
  }

  return next();
};

router.use(verifyJWT);
router.use(requireNormalUserProfileAccess);
router.use(requireRoles("user"));

router.route("/profile").get(userProfile);
router.route("/update-profile").patch(updateUserProfile);
router.route("/update-avatar").patch(upload.single("avatar"), updateUserAvatar);
router.route("/change-password").patch(changeUserPassword);

export default router;

