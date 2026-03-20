import mongoose from "mongoose";

const indiaJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    jobUrl: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "Adzuna",
    },
    profileEmail: {
      type: String,
      required: true,
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    shortlisted: {
      type: Boolean,
      default: false,
    },
    applied: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

indiaJobSchema.index({ jobId: 1, profileEmail: 1 }, { unique: true });

const IndiaJob =
  mongoose.models.IndiaJob || mongoose.model("IndiaJob", indiaJobSchema);

export default IndiaJob;
