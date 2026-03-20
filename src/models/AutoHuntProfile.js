const mongoose = require("mongoose");

const autoHuntProfileSchema = new mongoose.Schema(
  {
    profileName: {
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
    profilePhone: {
      type: String,
      trim: true,
      default: "",
    },
    profileLinkedIn: {
      type: String,
      trim: true,
      default: "",
    },
    profileGitHub: {
      type: String,
      trim: true,
      default: "",
    },
    resumeText: {
      type: String,
      required: true,
      trim: true,
    },
    preferredRoles: {
      type: [String],
      default: [],
    },
    preferredLocations: {
      type: [String],
      default: ["India", "Remote"],
    },
    minimumScore: {
      type: Number,
      default: 80,
    },
    remoteOnly: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AutoHuntProfile", autoHuntProfileSchema);
