

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createPost,
  getPosts,
  searchPosts,
  getPostById,
  deletePost,
  updatePost,
  reportPost,
} from "../controllers/post.controller.js";
import { verifyJWT, verifyJWTOptional } from "../middlewares/auth.middleware.js";
import { requireAuthor } from "../middlewares/role.middleware.js";

const router = Router();

router.route("/create-post").post(verifyJWT, requireAuthor, upload.single("thumbnail"), createPost);

router.route("/getAll-post").get(verifyJWTOptional, getPosts);
router.route("/search-post").get(verifyJWTOptional, searchPosts);

router.route("/get-post/:postId").get(verifyJWTOptional, getPostById);
router.route("/:postId/report").post(verifyJWT, reportPost);

router.route("/delete-post/:postId").delete(verifyJWT, requireAuthor, deletePost);

router.route("/update-post/:postId").put(verifyJWT, requireAuthor, upload.single("thumbnail"), updatePost);

export default router;

