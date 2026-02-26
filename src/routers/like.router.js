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

// Preferred routes
router.route("/posts/:postId/toggle").post(togglePostLike).patch(togglePostLike);
router.route("/comments/:commentId/toggle").post(toggleCommentLike).patch(toggleCommentLike);
router.route("/posts/:postId/like").post(togglePostLike).patch(togglePostLike);
router.route("/comments/:commentId/like").post(toggleCommentLike).patch(toggleCommentLike);
router.route("/post/:postId").post(togglePostLike).patch(togglePostLike);
router.route("/comment/:commentId").post(toggleCommentLike).patch(toggleCommentLike);
router.route("/posts").get(getLikedPosts);
router.route("/liked-posts").get(getLikedPosts);

// Backward-compatible routes
router.route("/toggle/post/:postId").post(togglePostLike).patch(togglePostLike);
router.route("/toggle/comment/:commentId").post(toggleCommentLike).patch(toggleCommentLike);
router.route("/toggle/post").post(togglePostLike).patch(togglePostLike);
router.route("/toggle/comment").post(toggleCommentLike).patch(toggleCommentLike);
router.route("/liked/posts").get(getLikedPosts);

export default router;
