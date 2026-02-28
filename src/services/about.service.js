import { AboutProfile } from "../models/aboutProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";

const SINGLETON_FILTER = { singletonKey: "about_profile" };
const PDF_MIME_TYPE = "application/pdf";

let resumeUploader = uploadOnCloudinary;

const getAboutWithResumeOrThrow = async (lean = false) => {
  const query = AboutProfile.findOne(SINGLETON_FILTER);
  const about = lean ? await query.lean() : await query;

  if (!about) {
    throw new ApiError(404, "About profile not found");
  }
  if (!about.resumeUrl) {
    throw new ApiError(404, "Resume not found");
  }

  return about;
};

const updateResume = async (file, updatedBy) => {
  if (file?.mimetype && file.mimetype !== PDF_MIME_TYPE) {
    throw new ApiError(400, "Only PDF resume uploads are allowed");
  }

  const filePayload = file?.buffer || file?.path;
  if (!filePayload) {
    throw new ApiError(400, "Resume file is required");
  }

  const existing = await AboutProfile.findOne(SINGLETON_FILTER);

  const uploaded = await resumeUploader(filePayload);

  if (!uploaded?.url) {
    throw new ApiError(500, "Failed to upload resume");
  }

  if (existing?.resumeUrl) {
    const oldPublicId =
      existing.resumeFile?.publicId || extractPublicId(existing.resumeUrl);
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId, { resource_type: "raw" });
    }
  }

  const nextResumeFile = {
    publicId: uploaded.public_id || null,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };

  const updated = await AboutProfile.findOneAndUpdate(
    SINGLETON_FILTER,
    {
      $set: {
        resumeUrl: uploaded.url,
        resumeFile: nextResumeFile,
        updatedBy,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  return updated;
};

const deleteResume = async (updatedBy) => {
  const existing = await getAboutWithResumeOrThrow();

  const publicId =
    existing.resumeFile?.publicId || extractPublicId(existing.resumeUrl);

  if (publicId) {
    await deleteFromCloudinary(publicId, { resource_type: "raw" });
  }

  const updated = await AboutProfile.findOneAndUpdate(
    SINGLETON_FILTER,
    {
      $set: {
        resumeUrl: "",
        updatedBy,
      },
      $unset: {
        resumeFile: "",
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return updated;
};

const getResumePreview = async () => {
  const about = await getAboutWithResumeOrThrow(true);

  return {
    url: about.resumeUrl,
    file: about.resumeFile || null,
  };
};

const getResumeDownloadUrl = async () => {
  const about = await getAboutWithResumeOrThrow(true);
  return about.resumeUrl;
};

const setResumeUploaderForTests = (uploader) => {
  resumeUploader = uploader || uploadOnCloudinary;
};

export {
  updateResume,
  deleteResume,
  getResumePreview,
  getResumeDownloadUrl,
  setResumeUploaderForTests,
};
