import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      default: "",
      index: true,
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
    country: {
      type: String,
      default: "in",
    },
    searchQuery: {
      type: String,
      default: "",
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "new",
      enum: ["new", "shortlisted", "tailored", "applied", "skipped"],
    },
    tailoredResume: {
      type: String,
      default: "",
    },
    coverNote: {
      type: String,
      default: "",
    },
    profileEmail: {
      type: String,
      default: "",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

export default Job;
