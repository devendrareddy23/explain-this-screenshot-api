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
    applyUrl: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
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
    salaryCurrency: {
      type: String,
      default: "",
      trim: true,
    },
    employmentType: {
      type: String,
      default: "",
      trim: true,
    },
    remote: {
      type: Boolean,
      default: false,
    },

    profileEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },

    score: {
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
    skipped: {
      type: Boolean,
      default: false,
    },

    appliedAt: {
      type: Date,
      default: null,
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
  { timestamps: true }
);

jobSchema.index({ profileEmail: 1, jobId: 1 }, { unique: false });
jobSchema.index({ profileEmail: 1, shortlisted: 1 });
jobSchema.index({ profileEmail: 1, applied: 1 });
jobSchema.index({ profileEmail: 1, skipped: 1 });
jobSchema.index({ profileEmail: 1, createdAt: -1 });

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

export { Job };
export default Job;
