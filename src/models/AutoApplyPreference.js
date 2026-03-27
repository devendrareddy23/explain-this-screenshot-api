import mongoose from "mongoose";

const autoApplyPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    profileEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    search: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      default: "",
      trim: true
    },
    country: {
      type: String,
      default: "in",
      trim: true,
      lowercase: true
    },
    remoteOnly: {
      type: Boolean,
      default: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    maxApplicationsPerRun: {
      type: Number,
      default: 5,
      min: 1,
      max: 25
    },
    lastRunAt: {
      type: Date,
      default: null
    },
    lastRunStatus: {
      type: String,
      enum: ["never", "success", "failed", "skipped"],
      default: "never"
    },
    lastRunMessage: {
      type: String,
      default: ""
    },
    lastAppliedCount: {
      type: Number,
      default: 0
    },
    totalAppliedCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const AutoApplyPreference = mongoose.model(
  "AutoApplyPreference",
  autoApplyPreferenceSchema
);

export default AutoApplyPreference;
