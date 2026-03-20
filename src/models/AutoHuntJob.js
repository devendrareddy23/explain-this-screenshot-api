const mongoose = require("mongoose");

const autoHuntJobSchema = new mongoose.Schema(
  {
    profileEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    redirectUrl: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "adzuna",
    },
    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    score: {
      type: Number,
      default: 0,
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    applied: {
      type: Boolean,
      default: false,
    },
    shortlisted: {
      type: Boolean,
      default: false,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
    rawJob: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

autoHuntJobSchema.index({ profileEmail: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("AutoHuntJob", autoHuntJobSchema);
