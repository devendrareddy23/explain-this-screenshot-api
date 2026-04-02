import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    jobId: {
      type: String,
      default: "",
      trim: true,
    },
    jobTitle: {
      type: String,
      default: "",
      trim: true,
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
    source: {
      type: String,
      default: "",
      trim: true,
    },
    applyUrl: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["applied", "failed", "manual"],
      default: "applied",
    },
    lifecycleStatus: {
      type: String,
      enum: ["Applied", "Viewed", "Interview", "Offer", "Negotiating", "Rejected"],
      default: "Applied",
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    autoApplied: {
      type: Boolean,
      default: false,
    },
    retryAttemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    resumeVersion: {
      type: String,
      enum: ["A", "B", "C", ""],
      default: "",
    },
    resumeVariant: {
      type: String,
      enum: ["A", "B", "C", ""],
      default: "",
    },
    resumeVariantLabel: {
      type: String,
      default: "",
      trim: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ user: 1, job: 1 }, { unique: true });
applicationSchema.index(
  { user: 1, jobId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      jobId: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

export default Application;
