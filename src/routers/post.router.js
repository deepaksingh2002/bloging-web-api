import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createPost, getPosts, getPostById, deletePost, updatePost } from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create-post").post(verifyJWT,
    upload.single("thumbnail"), 
    createPost);

router.route("/getAll-post").get(getPosts);

router.route("/get-post/:postId").get(getPostById);

router.route("/delete-post/:postId").delete(verifyJWT, deletePost);

router.route("/update-post/:postId").put(verifyJWT,
    upload.single("thumbnail"), 
    updatePost);

export default router;
