import Router from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {logInUser, logOutUser, registerUser} from "../controllers/user.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields({name: "avatar", maxCount: 1}),
    registerUser
);
router.route("/login").post(logInUser);
router.route("/logout").post(logOutUser);



export default router
