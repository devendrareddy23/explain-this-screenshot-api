import mongoose from "mongoose";

const amazonUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

amazonUsageSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

const AmazonUsage =
  mongoose.models.AmazonUsage ||
  mongoose.model("AmazonUsage", amazonUsageSchema);

export default AmazonUsage;
