import { Router } from "express";
import {
  getPendingAuthorApplications,
  reviewAuthorApplication,
  approveAuthorApplication,
  getAdminDashboard,
  getAdminProfile,
  updateAdminProfile,
  getAdminUsers,
  getAdminUserProfile,
  deleteAnyPost,
  deleteAnyComment,
  deleteUserAccount,
  getModerationLogs,
  getOpenReports,
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { validateAuthorApplicationReviewPayload } from "../middlewares/requestValidation.middleware.js";

const router = Router();

router.use(verifyJWT, requireAdmin);

router.get("/dashboard", getAdminDashboard);
router.get("/profile", getAdminProfile);
router.patch("/profile", upload.single("avatar"), updateAdminProfile);
router.get("/users", getAdminUsers);
router.get("/users/:userId", getAdminUserProfile);
router.get("/moderation-logs", getModerationLogs);
router.get("/reports", getOpenReports);
router.delete("/posts/:postId", deleteAnyPost);
router.delete("/comments/:commentId", deleteAnyComment);
router.delete("/users/:userId", deleteUserAccount);
router.get("/author-applications", getPendingAuthorApplications);
router.patch("/author-applications/:userId/approve", approveAuthorApplication);
router.patch("/author-applications/:userId", validateAuthorApplicationReviewPayload, reviewAuthorApplication);

export default router;
