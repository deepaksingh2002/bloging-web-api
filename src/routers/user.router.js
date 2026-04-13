

import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerUser,
  logInUser,
  logOutUser,
  getCurrentUser,
  applyForAuthor,
  refreshAccessToken,
  getSessionDebug,
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  validateAuthorApplicationPayload,
  validateLoginPayload,
  validateRegisterPayload,
} from "../middlewares/requestValidation.middleware.js";
import profileRouter from "./profile.router.js";

const router = Router();

// Authentication lifecycle routes.
router.post("/register", upload.single("avatar"), validateRegisterPayload, registerUser);
router.route("/login").post(validateLoginPayload, logInUser);
router.route("/logout").post(logOutUser);
router.route("/currentUser").get(verifyJWT, getCurrentUser);
<<<<<<< HEAD
router.route("/apply-author").post(verifyJWT, applyForAuthor);
=======
router.route("/apply-author").post(verifyJWT, validateAuthorApplicationPayload, applyForAuthor);
>>>>>>> 00dbadf2e6bf08ff9c8f137c95c1861007a2c99e
router.route("/refresh-token").post(refreshAccessToken);

// Non-production auth diagnostics.
router.route("/session").get(getSessionDebug);

// User profile routes under the same /users namespace.
router.use(profileRouter);

export default router;

