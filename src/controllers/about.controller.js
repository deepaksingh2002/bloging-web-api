import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getAboutProfile,
  upsertAboutProfile,
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

const putAbout = asyncHandler(async (req, res) => {
  const updated = await upsertAboutProfile(req.body, req.user?._id, true);

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

export { getAbout, putAbout, uploadResume, downloadResume };
