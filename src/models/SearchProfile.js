const mongoose = require("mongoose");

const searchProfileSchema = new mongoose.Schema(
  {
    profileName: {
      type: String,
      default: "",
      trim: true,
    },
    profileEmail: {
      type: String,
      default: "",
      trim: true,
    },
    profilePhone: {
      type: String,
      default: "",
      trim: true,
    },
    profileLinkedIn: {
      type: String,
      default: "",
      trim: true,
    },
    profileGitHub: {
      type: String,
      default: "",
      trim: true,
    },
    resumeText: {
      type: String,
      default: "",
    },
    preferredRoles: {
      type: String,
      default: "",
    },
    preferredLocations: {
      type: String,
      default: "",
    },
    minimumScore: {
      type: Number,
      default: 80,
    },
    remoteOnly: {
      type: Boolean,
      default: true,
    },
    globalSearch: {
      type: Boolean,
      default: true,
    },
    isSearchActive: {
      type: Boolean,
      default: false,
    },
    lastSearchedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SearchProfile", searchProfileSchema);
