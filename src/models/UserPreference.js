import mongoose from "mongoose";

const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    preferredRoles: {
      type: [String],
      default: [],
    },
    preferredLocations: {
      type: [String],
      default: [],
    },
    workTypes: {
      type: [String],
      default: ["remote"],
    },
    country: {
      type: String,
      trim: true,
      lowercase: true,
      default: "in",
    },
    minimumMatchScore: {
      type: Number,
      default: 80,
      min: 1,
      max: 100,
    },
    expectedSalaryMin: {
      type: Number,
      default: null,
      min: 0,
    },
    companySizePreference: {
      type: String,
      enum: ["any", "startup", "mid", "enterprise"],
      default: "any",
    },
    careerInterviewAnswers: {
      biggestAchievement: { type: String, default: "" },
      flowWork: { type: String, default: "" },
      yesSalary: { type: String, default: "" },
      dreamCompanies: { type: String, default: "" },
      strongestSkills: { type: String, default: "" },
      idealEnvironment: { type: String, default: "" },
    },
    careerInterviewCompletedAt: {
      type: Date,
      default: null,
    },
    careerDna: {
      summary: { type: String, default: "" },
      hardSkills: {
        type: [
          {
            name: { type: String, default: "" },
            weight: { type: Number, default: 0 },
          },
        ],
        default: [],
      },
      softSkills: {
        type: [
          {
            name: { type: String, default: "" },
            weight: { type: Number, default: 0 },
          },
        ],
        default: [],
      },
      ambitionScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      cultureFitPreferences: {
        type: [String],
        default: [],
      },
      salaryConfidenceScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      dreamCompanyWishlist: {
        type: [String],
        default: [],
      },
      salaryTargetText: {
        type: String,
        default: "",
      },
      salaryTargetValue: {
        type: Number,
        default: null,
      },
    },
    resumeExperiment: {
      winningVariant: {
        type: String,
        enum: ["A", "B", "C", ""],
        default: "",
      },
      totalEvaluatedApplications: {
        type: Number,
        default: 0,
      },
      autoOptimizeEnabled: {
        type: Boolean,
        default: true,
      },
      lastWinnerDeclaredAt: {
        type: Date,
        default: null,
      },
    },
    candidateDiscovery: {
      enabled: {
        type: Boolean,
        default: false,
      },
      headline: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

const UserPreference =
  mongoose.models.UserPreference ||
  mongoose.model("UserPreference", userPreferenceSchema);

export default UserPreference;
