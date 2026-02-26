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

const router = Router();

router.use(verifyJWT);

router.route("/profile").get(userProfile);
router.route("/update-profile").patch(updateUserProfile);
router.route("/update-avatar").patch(upload.single("avatar"), updateUserAvatar);
router.route("/change-password").patch(changeUserPassword);

export default router;

