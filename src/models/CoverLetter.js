import mongoose from "mongoose";

const coverLetterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeText: {
      type: String,
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    coverLetterText: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "Untitled Cover Letter",
    },
  },
  { timestamps: true }
);

export const CoverLetter = mongoose.model("CoverLetter", coverLetterSchema);
