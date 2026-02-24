/**
 * File: D:\Fs\Blog\backend\src\routers\like.router.js
 * Purpose: Backend module for the blog API (routes, controllers, models, middleware, or utilities).
 */

import { Router } from "express";
import { togglePostLike,toggleCommentLike, getLikedPosts } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/post/:postId").post(togglePostLike);
router.route("/toggle/comment/:commentId").post(toggleCommentLike);
router.route("/liked/posts").get(getLikedPosts);    

export default router;
