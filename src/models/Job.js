import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    jobId: {
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

    title: {
      type: String,
      default: "",
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    jobUrl: {
      type: String,
      default: "",
      trim: true,
    },
    applyUrl: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    remote: {
      type: Boolean,
      default: false,
    },

    employmentType: {
      type: String,
      default: "",
      trim: true,
    },

    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    salaryCurrency: {
      type: String,
      default: "",
      trim: true,
    },

    score: {
      type: Number,
      default: 0,
    },
    matchScore: {
      type: Number,
      default: 0,
    },
    aiScore10: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    aiScoreReason: {
      type: String,
      default: "",
    },
    aiScoreBreakdown: {
      skills: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 40 },
        note: { type: String, default: "" },
      },
      experience: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 20 },
        note: { type: String, default: "" },
      },
      location: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 20 },
        note: { type: String, default: "" },
      },
      salary: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 10 },
        note: { type: String, default: "" },
      },
      companySize: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 10 },
        note: { type: String, default: "" },
      },
    },
    aiMatchLabel: {
      type: String,
      enum: ["Strong Match", "Good Match", "Weak Match"],
      default: "Weak Match",
    },
    reasons: {
      type: [String],
      default: [],
    },
    workflowState: {
      type: String,
      enum: [
        "found",
        "scored",
        "shortlisted",
        "resume_tailored",
        "cover_letter_generated",
        "ready_to_apply",
        "applied",
        "failed",
        "manual_action_needed",
      ],
      default: "found",
    },
    workflowTimeline: {
      type: [
        {
          status: { type: String, default: "" },
          label: { type: String, default: "" },
          note: { type: String, default: "" },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    manualActionNeeded: {
      type: Boolean,
      default: false,
    },
    manualActionRequired: {
      type: Boolean,
      default: false,
    },
    manualApplyInProgress: {
      type: Boolean,
      default: false,
    },
    manualApplyStartedAt: {
      type: Date,
      default: null,
    },
    manualActionReason: {
      type: String,
      default: "",
    },
    sourceCapabilities: {
      searchSupported: { type: Boolean, default: true },
      shortlistSupported: { type: Boolean, default: true },
      autoApplySupported: { type: Boolean, default: false },
    },
    tailoredResumeText: {
      type: String,
      default: "",
    },
    resumeVariants: {
      type: [
        {
          variantId: { type: String, default: "" },
          label: { type: String, default: "" },
          strategy: { type: String, default: "" },
          text: { type: String, default: "" },
          matchScore: { type: Number, default: 0 },
          keywordsAdded: { type: [String], default: [] },
          improvementSummary: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    selectedResumeVariant: {
      type: String,
      enum: ["A", "B", "C", ""],
      default: "",
    },
    selectedResumeVariantReason: {
      type: String,
      default: "",
    },
    coverLetterText: {
      type: String,
      default: "",
    },
    applicationNotificationSentAt: {
      type: Date,
      default: null,
    },
    applicationNotificationStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    applicationNotificationError: {
      type: String,
      default: "",
    },

    shortlisted: {
      type: Boolean,
      default: false,
    },
    applied: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    appliedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    skipped: {
      type: Boolean,
      default: false,
    },
    skippedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },
    companyIntelligence: {
      glassdoorRating: { type: Number, default: null },
      commonComplaints: { type: [String], default: [] },
      glassdoorStatus: { type: String, default: "" },
      recentNews: {
        type: [
          {
            title: { type: String, default: "" },
            url: { type: String, default: "" },
            publishedAt: { type: Date, default: null },
          },
        ],
        default: [],
      },
      recentNewsStatus: { type: String, default: "" },
      growthSignal: { type: String, default: "" },
      techStack: { type: [String], default: [] },
      salaryInsight: {
        label: { type: String, default: "" },
        source: { type: String, default: "" },
      },
      timeToHire: {
        label: { type: String, default: "" },
        isEstimated: { type: Boolean, default: false },
        source: { type: String, default: "" },
      },
      recruiter: {
        recruiterEmail: { type: String, default: "" },
        recruiterName: { type: String, default: "" },
        linkedinUrl: { type: String, default: "" },
        source: { type: String, default: "" },
      },
      interviewProcess: {
        summary: { type: String, default: "" },
        source: { type: String, default: "" },
      },
      recommendation: {
        label: { type: String, default: "" },
        reason: { type: String, default: "" },
      },
      matchScore10: { type: Number, default: 0 },
      confidenceNotes: { type: [String], default: [] },
    },

    rawJobData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One user can save a given job only once
JobSchema.index({ jobId: 1, profileEmail: 1 }, { unique: true });

// Useful query indexes
JobSchema.index({ profileEmail: 1, createdAt: -1 });
JobSchema.index({ profileEmail: 1, applied: 1 });
JobSchema.index({ profileEmail: 1, skipped: 1 });
JobSchema.index({ profileEmail: 1, shortlisted: 1 });

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);

export default Job;
