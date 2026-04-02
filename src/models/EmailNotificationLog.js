import mongoose from "mongoose";

const emailNotificationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emailNotificationLogSchema.index({ user: 1, type: 1, dedupeKey: 1 }, { unique: true });

const EmailNotificationLog =
  mongoose.models.EmailNotificationLog ||
  mongoose.model("EmailNotificationLog", emailNotificationLogSchema);

export default EmailNotificationLog;
