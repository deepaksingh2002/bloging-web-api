import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireAdmin } from "../middlewares/role.middleware.js";
import {
  createResumeHandler,
  deleteResumeFile,
  previewResume,
  downloadResume,
} from "../controllers/resume.controller.js";
import { createInMemoryRateLimiter } from "../middlewares/rateLimit.middleware.js";
import { ApiError } from "../utils/ApiError.js";

const resumePublicLimiter = createInMemoryRateLimiter({
  windowMs: Number(process.env.ABOUT_PUBLIC_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.ABOUT_PUBLIC_RATE_LIMIT_MAX || 120),
  keyPrefix: "about-public",
});

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.RESUME_MAX_SIZE_BYTES || 5 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf";
    if (!isPdf) {
      return cb(new ApiError(400, "Only PDF resume uploads are allowed"));
    }
    return cb(null, true);
  },
});

const router = Router();

const resumeProtectedMiddlewares = [
  verifyJWT,
  requireAdmin,
  resumeUpload.single("resume"),
];

// Canonical resume routes.
router.post("/resume", ...resumeProtectedMiddlewares, createResumeHandler);
router.put("/resume", ...resumeProtectedMiddlewares, createResumeHandler);
router.delete("/resume", verifyJWT, requireAdmin, deleteResumeFile);
router.get("/resume/preview", resumePublicLimiter, previewResume);
router.get("/resume/download", resumePublicLimiter, downloadResume);

export default router;
