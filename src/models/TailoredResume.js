import mongoose from "mongoose";

const tailoredResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalResumeText: {
      type: String,
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    tailoredResumeText: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "Untitled Tailored Resume",
    },
  },
  { timestamps: true }
);

export const TailoredResume = mongoose.model(
  "TailoredResume",
  tailoredResumeSchema
);
