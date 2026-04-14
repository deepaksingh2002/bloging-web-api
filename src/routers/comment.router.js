

import { Router } from "express";
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment,
  reportComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Comment list/create for a post.
router.route("/posts/:postId/comments").get(getPostComments).post(verifyJWT, createComment);
// Comment mutation by comment id.
router.route("/:commentId").patch(verifyJWT, updateComment).delete(verifyJWT, deleteComment);
router.route("/:commentId/report").post(verifyJWT, reportComment);

export default router;
