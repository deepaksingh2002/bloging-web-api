import { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import {createPost, getPosts, getPostById} from "../controllers/post.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/createPost").post(verifyJWT,
    upload.fields([{ name: "thumbnill", maxCount: 1 }]),
    createPost);

router.route("/getPost").get(getPosts);

router.route("/getPost/:postId").get(getPostById);






export default router;