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

<<<<<<< HEAD:src/routers/about.router.js
router.post(
  "/resume",
=======
const resumeProtectedMiddlewares = [
>>>>>>> 00dbadf2e6bf08ff9c8f137c95c1861007a2c99e:src/routers/resume.router.js
  verifyJWT,
  requireAdmin,
  resumeUpload.single("resume"),
<<<<<<< HEAD:src/routers/about.router.js
  uploadResume
);
router.put(
  "/resume",
  verifyJWT,
  verifyDeveloperAccess,
  resumeUpload.single("resume"),
  uploadResume
);
router.delete(
  "/resume",
  verifyJWT,
  verifyDeveloperAccess,
  deleteResumeFile
);
router.get("/resume/preview", aboutPublicLimiter, previewResume);
router.get("/resume/download", aboutPublicLimiter, downloadResume);
=======
];

// Canonical resume routes.
router.post("/resume", ...resumeProtectedMiddlewares, createResumeHandler);
router.put("/resume", ...resumeProtectedMiddlewares, createResumeHandler);
router.delete("/resume", verifyJWT, requireAdmin, deleteResumeFile);
router.get("/resume/preview", resumePublicLimiter, previewResume);
router.get("/resume/download", resumePublicLimiter, downloadResume);
>>>>>>> 00dbadf2e6bf08ff9c8f137c95c1861007a2c99e:src/routers/resume.router.js

export default router;
