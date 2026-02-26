/**
 * File: D:\Fs\Blog\backend\src\routers\user.router.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerUser,
  logInUser,
  logOutUser,
  getCurrentUser,
  refreshAccessToken,
  getSessionDebug,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", upload.single("avatar"), registerUser);
router.route("/login").post(logInUser);
router.route("/logout").post(logOutUser);
router.route("/currentUser").get(verifyJWT, getCurrentUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/session").get(getSessionDebug);

export default router;

