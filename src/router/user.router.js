import Router from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {registerUser} from "../controllers/user.controllers.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields({name: "avatar", maxCount: 1}),
    registerUser
)

router.route


export default router
