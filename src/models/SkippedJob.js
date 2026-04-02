import mongoose from "mongoose";

const skippedJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: String,
      required: true,
      trim: true,
    },
    skippedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

skippedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const SkippedJob =
  mongoose.models.SkippedJob || mongoose.model("SkippedJob", skippedJobSchema);

export default SkippedJob;
