import mongoose, { Schema } from "mongoose";

const resumeFileSchema = new Schema(
  {
    publicId: {
      type: String,
      trim: true,
    },
    originalName: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const aboutProfileSchema = new Schema(
  {
    singletonKey: {
      type: String,
      default: "about_profile",
      unique: true,
      immutable: true,
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: "",
    },
    resumeFile: {
      type: resumeFileSchema,
      default: undefined,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const AboutProfile = mongoose.model("AboutProfile", aboutProfileSchema);
