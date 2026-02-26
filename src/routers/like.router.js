/**
 * File: D:\Fs\Blog\backend\src\routers\like.router.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { Router } from "express";
import {
  togglePostLike,
  toggleCommentLike,
  getLikedPosts,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// Canonical routes
router.route("/posts/:postId/like").patch(togglePostLike).post(togglePostLike);
router.route("/comments/:commentId/like").patch(toggleCommentLike).post(toggleCommentLike);
router.get("/liked-posts", getLikedPosts);

// Backward-compatible routes used by older frontend builds.
router.route("/posts/:postId/toggle").patch(togglePostLike).post(togglePostLike);
router.route("/comments/:commentId/toggle").patch(toggleCommentLike).post(toggleCommentLike);
router.route("/toggle/post/:postId").patch(togglePostLike).post(togglePostLike);
router.route("/toggle/comment/:commentId").patch(toggleCommentLike).post(toggleCommentLike);
router.route("/toggle/post").patch(togglePostLike).post(togglePostLike);
router.route("/toggle/comment").patch(toggleCommentLike).post(toggleCommentLike);
router.get("/posts", getLikedPosts);
router.get("/liked/posts", getLikedPosts);

export default router;
