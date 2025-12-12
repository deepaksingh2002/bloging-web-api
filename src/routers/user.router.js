import Router from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { registerUser, logInUser, logOutUser, getCurrentUser, refreshAccessToken } from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", upload.single("avatar"), registerUser);


router.route("/login").post(logInUser);

router.route("/logout").post(verifyJWT, logOutUser);

router.route("/currentUser").get(verifyJWT, getCurrentUser);

router.route("/refresh-token").post(refreshAccessToken);

export default router;
