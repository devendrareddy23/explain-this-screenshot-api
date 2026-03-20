import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      index: true,
    },
    profileEmail: {
      type: String,
      required: true,
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
    redirectUrl: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "adzuna",
    },
    score: {
      type: Number,
      default: 0,
    },
    matchReasons: {
      type: [String],
      default: [],
    },
    applied: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
    rawJob: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ jobId: 1, profileEmail: 1 }, { unique: true });

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

export default Job;
