import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      trim: true,
    },
    profileEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    title: {
      type: String,
      default: "",
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
    description: {
      type: String,
      default: "",
    },
    jobUrl: {
      type: String,
      default: "",
      trim: true,
    },
    applyUrl: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    remote: {
      type: Boolean,
      default: false,
    },

    employmentType: {
      type: String,
      default: "",
      trim: true,
    },

    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    salaryCurrency: {
      type: String,
      default: "",
      trim: true,
    },

    score: {
      type: Number,
      default: 0,
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    reasons: {
      type: [String],
      default: [],
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

    skipped: {
      type: Boolean,
      default: false,
    },
    skippedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },

    rawJobData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One user can save a given job only once
JobSchema.index({ jobId: 1, profileEmail: 1 }, { unique: true });

// Useful query indexes
JobSchema.index({ profileEmail: 1, createdAt: -1 });
JobSchema.index({ profileEmail: 1, applied: 1 });
JobSchema.index({ profileEmail: 1, skipped: 1 });
JobSchema.index({ profileEmail: 1, shortlisted: 1 });

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

export default Job;
