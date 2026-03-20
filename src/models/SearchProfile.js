const mongoose = require("mongoose");

const searchProfileSchema = new mongoose.Schema(
  {
    profileName: {
      type: String,
      trim: true,
      default: "",
    },
    profileEmail: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
      default: "",
    },
    preferredRoles: {
      type: [String],
      default: [],
    },
    preferredLocations: {
      type: [String],
      default: [],
    },
    minimumScore: {
      type: Number,
      default: 60,
    },
    remoteOnly: {
      type: Boolean,
      default: false,
    },
    country: {
      type: String,
      trim: true,
      default: "in",
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.SearchProfile ||
  mongoose.model("SearchProfile", searchProfileSchema);
