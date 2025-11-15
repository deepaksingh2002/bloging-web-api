import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {createPost, getPosts, getPostById, deletePost} from "../controllers/post.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createPost").post(verifyJWT,
    upload.fields([{ name: "thumbnill", maxCount: 1 }]),
    createPost);

router.route("/getPost").get(getPosts);

router.route("/getPost/:postId").get(getPostById);

router.route("/deletePost/:postId").delete(verifyJWT, deletePost);

router.route("/updatePost/:postId").put(verifyJWT,
    upload.fields([{ name: "thumbnill", maxCount: 1 }]),
    updatePost);



export default router;