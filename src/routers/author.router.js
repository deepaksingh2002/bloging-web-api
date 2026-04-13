import { Router } from "express";
import {
  getAuthorDashboard,
  getAuthorProfile,
  getManagedPosts,
} from "../controllers/author.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireAuthor } from "../middlewares/role.middleware.js";

const router = Router();

router.use(verifyJWT, requireAuthor);

router.get("/dashboard", getAuthorDashboard);
router.get("/profile", getAuthorProfile);
router.get("/posts/manage", getManagedPosts);

export default router;
