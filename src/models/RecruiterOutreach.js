import mongoose from "mongoose";

const recruiterOutreachSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    companyDomain: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    recruiterEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    recruiterName: {
      type: String,
      default: "",
      trim: true,
    },
    recruiterIntelligence: {
      linkedinProfileUrl: { type: String, default: "" },
      recentPosts: {
        type: [
          {
            title: { type: String, default: "" },
            excerpt: { type: String, default: "" },
            url: { type: String, default: "" },
            publishedAt: { type: Date, default: null },
          },
        ],
        default: [],
      },
      recentPostsStatus: { type: String, default: "" },
      recentHiringFocus: { type: [String], default: [] },
      recentHiringFocusStatus: { type: String, default: "" },
      careerBackgroundSummary: { type: String, default: "" },
      careerBackgroundStatus: { type: String, default: "" },
      mutualConnections: { type: [String], default: [] },
      mutualConnectionsCount: { type: Number, default: 0 },
      mutualConnectionsStatus: { type: String, default: "" },
      verifiedContextSummary: { type: String, default: "" },
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    body: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "sent", "opened", "replied", "not_found", "failed"],
      default: "pending",
    },
    sentAt: {
      type: Date,
      default: null,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    messageId: {
      type: String,
      default: "",
      trim: true,
    },
    error: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

recruiterOutreachSchema.index({ profileEmail: 1, jobId: 1 }, { unique: true });

const RecruiterOutreach =
  mongoose.models.RecruiterOutreach ||
  mongoose.model("RecruiterOutreach", recruiterOutreachSchema);

export default RecruiterOutreach;
