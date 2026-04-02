import mongoose from "mongoose";

const referralAssistSchema = new mongoose.Schema(
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
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserConnection",
      default: null,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    matchedConnectionName: {
      type: String,
      default: "",
      trim: true,
    },
    matchedConnectionCompany: {
      type: String,
      default: "",
      trim: true,
    },
    connectionSource: {
      type: String,
      default: "",
      trim: true,
    },
    linkedinOauthConfigured: {
      type: Boolean,
      default: false,
    },
    linkedinConnected: {
      type: Boolean,
      default: false,
    },
    referralMessage: {
      type: String,
      default: "",
    },
    referredApplicationsLiftLabel: {
      type: String,
      default: "Referral applications usually outperform cold applications.",
    },
  },
  {
    timestamps: true,
  }
);

referralAssistSchema.index({ user: 1, job: 1 }, { unique: true });

const ReferralAssist =
  mongoose.models.ReferralAssist || mongoose.model("ReferralAssist", referralAssistSchema);

export default ReferralAssist;
