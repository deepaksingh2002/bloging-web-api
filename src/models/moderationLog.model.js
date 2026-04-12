import mongoose, { Schema } from "mongoose";

const moderationLogSchema = new Schema(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["delete_post", "delete_comment"],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    snapshot: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const ModerationLog = mongoose.model("ModerationLog", moderationLogSchema);
