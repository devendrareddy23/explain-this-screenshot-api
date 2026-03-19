const mongoose = require("mongoose");

const matchedJobSchema = new mongoose.Schema(
  {
    searchProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SearchProfile",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Auto Applied", "Saved for Review", "Skipped"],
      default: "Saved for Review",
    },
    reason: {
      type: String,
      default: "",
    },
    blocker: {
      type: Boolean,
      default: false,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

matchedJobSchema.index({ searchProfile: 1, job: 1 }, { unique: true });

module.exports = mongoose.model("MatchedJob", matchedJobSchema);
