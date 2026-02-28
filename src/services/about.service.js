import { AboutProfile } from "../models/aboutProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "../utils/cloudinary.js";

const REQUIRED_FIELDS = [
  "fullName",
  "headline",
  "summary",
  "location",
  "email",
  "phone",
  "experience",
  "education",
];
const SINGLETON_FILTER = { singletonKey: "about_profile" };

let resumeUploader = uploadOnCloudinary;

const normalizeSkills = (skills) => {
  if (skills === undefined) return undefined;
  if (Array.isArray(skills)) {
    return skills.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof skills === "string") {
    return skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  throw new ApiError(400, "Skills must be a string or array of strings");
};

const validatePayload = (payload, enforceRequiredFields = false) => {
  const output = {};

  for (const field of REQUIRED_FIELDS) {
    const value = payload[field];

    if (enforceRequiredFields && (value === undefined || String(value).trim() === "")) {
      throw new ApiError(400, `${field} is required`);
    }

    if (value !== undefined) {
      output[field] = String(value).trim();
    }
  }

  if (output.email !== undefined) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(output.email)) {
      throw new ApiError(400, "Please provide a valid email address");
    }
    output.email = output.email.toLowerCase();
  }

  const skills = normalizeSkills(payload.skills);
  if (skills !== undefined) {
    output.skills = skills;
  }

  if (payload.resumeUrl !== undefined) {
    output.resumeUrl = String(payload.resumeUrl).trim();
  }

  return output;
};

const getAboutProfile = async () => {
  return AboutProfile.findOne(SINGLETON_FILTER).lean();
};

const upsertAboutProfile = async (payload, updatedBy, enforceRequiredFields = false) => {
  const safePayload = validatePayload(payload, enforceRequiredFields);

  if (updatedBy) {
    safePayload.updatedBy = updatedBy;
  }

  const updated = await AboutProfile.findOneAndUpdate(
    SINGLETON_FILTER,
    { $set: safePayload },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  return updated;
};

const updateResume = async (file, updatedBy) => {
  const filePayload = file?.buffer || file?.path;
  if (!filePayload) {
    throw new ApiError(400, "Resume file is required");
  }

  const existing = await AboutProfile.findOne(SINGLETON_FILTER);
  if (!existing) {
    throw new ApiError(400, "Create about profile before uploading resume");
  }

  const uploaded = await resumeUploader(filePayload);

  if (!uploaded?.url) {
    throw new ApiError(500, "Failed to upload resume");
  }

  if (existing?.resumeUrl) {
    const oldPublicId = extractPublicId(existing.resumeUrl);
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId);
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

const getResumeDownloadUrl = async () => {
  const about = await AboutProfile.findOne(SINGLETON_FILTER).lean();
  if (!about) {
    throw new ApiError(404, "About profile not found");
  }
  if (!about.resumeUrl) {
    throw new ApiError(404, "Resume not found");
  }
  return about.resumeUrl;
};

const setResumeUploaderForTests = (uploader) => {
  resumeUploader = uploader || uploadOnCloudinary;
};

export {
  getAboutProfile,
  upsertAboutProfile,
  updateResume,
  getResumeDownloadUrl,
  setResumeUploaderForTests,
};
