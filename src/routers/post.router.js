import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createPost, getPosts, getPostById, deletePost, updatePost } from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createPost").post(verifyJWT,
    upload.single("thumbnail"), 
    createPost);

router.route("/getPost").get(getPosts);

router.route("/getPost/:postId").get(getPostById);

router.route("/deletePost/:postId").delete(verifyJWT, deletePost);

router.route("/updatePost/:postId").patch(verifyJWT,
    upload.single("thumbnail"), 
    updatePost);

export default router;