import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyOwnerAccess } from "../middlewares/owner.middleware.js";
import {
  getAbout,
  getAboutForDashboard,
  createAbout,
  updateAbout,
  uploadResume,
  downloadResume,
} from "../controllers/about.controller.js";
import { createInMemoryRateLimiter } from "../middlewares/rateLimit.middleware.js";
import { ApiError } from "../utils/ApiError.js";

const aboutPublicLimiter = createInMemoryRateLimiter({
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

router.get("/", aboutPublicLimiter, getAbout);
router.get("/dashboard", verifyJWT, verifyOwnerAccess, getAboutForDashboard);
router.post("/", verifyJWT, verifyOwnerAccess, createAbout);
router.patch("/", verifyJWT, verifyOwnerAccess, updateAbout);
router.put("/", verifyJWT, verifyOwnerAccess, updateAbout);
router.post(
  "/resume",
  verifyJWT,
  verifyOwnerAccess,
  resumeUpload.single("resume"),
  uploadResume
);
router.get("/resume/download", aboutPublicLimiter, downloadResume);

export default router;
