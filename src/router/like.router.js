import { Router } from "express";
import { togglePostLike,toggleCommentLike, getLikedPosts } from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/post/:postId").post(togglePostLike);
router.route("/toggle/comment/:commentId").post(toggleCommentLike);
router.route("/liked/posts").get(getLikedPosts);    

export default router;