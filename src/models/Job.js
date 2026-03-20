const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    externalJobId: {
      type: String,
      index: true,
      default: "",
    },
    source: {
      type: String,
      default: "adzuna",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "in",
      lowercase: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    snippet: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    created: {
      type: String,
      default: "",
    },
    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    matchScore: {
      type: Number,
      default: 0,
      index: true,
    },
    matchingSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    searchQuery: {
      type: String,
      default: "",
      trim: true,
    },
    preferredRoles: {
      type: String,
      default: "",
    },
    preferredLocations: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["new", "shortlisted", "tailored", "applied", "skipped"],
      default: "new",
      index: true,
    },
    tailoredResume: {
      type: String,
      default: "",
    },
    coverNote: {
      type: String,
      default: "",
    },
    fetchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ externalJobId: 1, source: 1 }, { unique: true, sparse: true });
jobSchema.index({ url: 1, source: 1 }, { unique: true });

module.exports = mongoose.model("Job", jobSchema);
