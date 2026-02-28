import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  updateResume,
  deleteResume,
  getResumeDownloadUrl,
} from "../services/about.service.js";

const uploadResume = asyncHandler(async (req, res) => {
  const updated = await updateResume(req.file, req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Resume uploaded successfully"));
});

const deleteResumeFile = asyncHandler(async (req, res) => {
  const updated = await deleteResume(req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Resume deleted successfully"));
});

const previewResume = asyncHandler(async (_req, res) => {
  const url = await getResumeDownloadUrl();
  return res.redirect(url);
});

const downloadResume = asyncHandler(async (_req, res) => {
  const url = await getResumeDownloadUrl();
  return res.redirect(url);
});

export {
  uploadResume,
  deleteResumeFile,
  previewResume,
  downloadResume,
};
