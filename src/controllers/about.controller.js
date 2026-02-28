import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getAboutProfile,
  createAboutProfile,
  updateAboutProfile,
  updateResume,
  getResumeDownloadUrl,
} from "../services/about.service.js";

const getAbout = asyncHandler(async (_req, res) => {
  const about = await getAboutProfile();

  if (!about) {
    throw new ApiError(404, "About profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, about, "About profile fetched successfully"));
});

const getAboutForDashboard = asyncHandler(async (_req, res) => {
  const about = await getAboutProfile();

  return res
    .status(200)
    .json(new ApiResponse(200, about || null, "About profile fetched successfully"));
});

const createAbout = asyncHandler(async (req, res) => {
  const created = await createAboutProfile(req.body, req.user?._id);

  return res
    .status(201)
    .json(new ApiResponse(201, created, "About profile created successfully"));
});

const updateAbout = asyncHandler(async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Request body is required");
  }

  const updated = await updateAboutProfile(req.body, req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "About profile updated successfully"));
});

const uploadResume = asyncHandler(async (req, res) => {
  const updated = await updateResume(req.file, req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Resume uploaded successfully"));
});

const downloadResume = asyncHandler(async (_req, res) => {
  const url = await getResumeDownloadUrl();
  return res.redirect(url);
});

export {
  getAbout,
  getAboutForDashboard,
  createAbout,
  updateAbout,
  uploadResume,
  downloadResume,
};
