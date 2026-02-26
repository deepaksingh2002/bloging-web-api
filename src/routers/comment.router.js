/**
 * File: D:/Fs/Blog/backend/src/routers/comment.router.js
 * Purpose: Comment API routes.
 */

import { Router } from "express";
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/post/:postId").get(getPostComments).post(verifyJWT, createComment);
router.route("/create/:postId").post(verifyJWT, createComment);
router.route("/posts/:postId/comments").get(getPostComments).post(verifyJWT, createComment);
router.route("/:commentId").patch(verifyJWT, updateComment).delete(verifyJWT, deleteComment);

export default router;
