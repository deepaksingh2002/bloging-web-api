

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

const router = Router();

// Authentication lifecycle routes.
router.post("/register", upload.single("avatar"), validateRegisterPayload, registerUser);
router.route("/login").post(validateLoginPayload, logInUser);
router.route("/logout").post(logOutUser);
router.route("/currentUser").get(verifyJWT, getCurrentUser);
router.route("/apply-author").post(verifyJWT, validateAuthorApplicationPayload, applyForAuthor);
router.route("/refresh-token").post(refreshAccessToken);

// Non-production auth diagnostics.
router.route("/session").get(getSessionDebug);

export default router;

