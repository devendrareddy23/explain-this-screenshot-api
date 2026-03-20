import mongoose from "mongoose";

const searchProfileSchema = new mongoose.Schema(
  {
    profileName: {
      type: String,
      default: "",
    },
    profileEmail: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    profilePhone: {
      type: String,
      default: "",
    },
    profileLinkedIn: {
      type: String,
      default: "",
    },
    profileGitHub: {
      type: String,
      default: "",
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
      default: 50,
    },
    country: {
      type: String,
      default: "in",
    },
    autoHuntEnabled: {
      type: Boolean,
      default: false,
    },
    lastSearchQuery: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const SearchProfile =
  mongoose.models.SearchProfile ||
  mongoose.model("SearchProfile", searchProfileSchema);

export default SearchProfile;
