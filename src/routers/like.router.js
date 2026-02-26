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
router.patch("/posts/:postId/like", togglePostLike);
router.patch("/comments/:commentId/like", toggleCommentLike);
router.get("/liked-posts", getLikedPosts);

export default router;
