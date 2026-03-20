const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      trim: true,
      default: undefined,
    },
    profileEmail: {
      type: String,
      trim: true,
      default: undefined,
    },
    source: {
      type: String,
      default: "",
    },
    externalId: {
      type: String,
      default: "",
    },
    searchQuery: {
      type: String,
      default: "",
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
    category: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
    },
    salary: {
      type: String,
      default: "",
    },
    publicationDate: {
      type: String,
      default: "",
    },
    descriptionSnippet: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "global",
    },
    jobUrl: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      default: "",
    },
    redirectUrl: {
      type: String,
      default: "",
    },
    score: {
      type: Number,
      default: 0,
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    matchReasons: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: "new",
    },
    applied: {
      type: Boolean,
      default: false,
    },
    coverNote: {
      type: String,
      default: "",
    },
    tailoredResume: {
      type: String,
      default: "",
    },
    rawJob: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ url: 1 }, { unique: true, sparse: true });

jobSchema.index(
  { jobId: 1, profileEmail: 1 },
  {
    unique: true,
    partialFilterExpression: {
      jobId: { $gt: "" },
      profileEmail: { $gt: "" },
    },
  }
);

module.exports =
  mongoose.models.Job || mongoose.model("Job", jobSchema);
