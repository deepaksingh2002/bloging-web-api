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
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    headline: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.every((item) => typeof item === "string");
        },
        message: "Skills must be an array of strings",
      },
    },
    experience: {
      type: String,
      trim: true,
    },
    education: {
      type: String,
      trim: true,
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

aboutProfileSchema.index({ email: 1 });

export const AboutProfile = mongoose.model("AboutProfile", aboutProfileSchema);
