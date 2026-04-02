import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    why: { type: String, default: "" },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    talkTrack: { type: String, default: "" },
  },
  { _id: false }
);

const scoreSchema = new mongoose.Schema(
  {
    confidence: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    relevance: { type: Number, default: 0 },
    overall: { type: Number, default: 0 },
  },
  { _id: false }
);

const practiceFeedbackSchema = new mongoose.Schema(
  {
    summary: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    sampleUpgrade: { type: String, default: "" },
    scores: { type: scoreSchema, default: () => ({}) },
  },
  { _id: false }
);

const practiceAttemptSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    answer: { type: String, default: "" },
    mode: {
      type: String,
      enum: ["text", "voice"],
      default: "text",
    },
    feedback: { type: practiceFeedbackSchema, default: () => ({}) },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const interviewPrepSchema = new mongoose.Schema(
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
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
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
    interviewScheduledAt: {
      type: Date,
      default: null,
    },
    jobDescription: {
      type: String,
      default: "",
    },
    companySnapshot: {
      headline: { type: String, default: "" },
      fiveThingsToKnow: { type: [String], default: [] },
      recentNewsSignals: { type: [String], default: [] },
      techStackSignals: { type: [String], default: [] },
      cultureSignals: { type: [String], default: [] },
    },
    likelyQuestions: {
      technical: { type: [questionSchema], default: [] },
      behavioral: { type: [questionSchema], default: [] },
      companyNews: { type: [questionSchema], default: [] },
    },
    preInterviewBrief: {
      intro: { type: String, default: "" },
      fiveThingsToKnow: { type: [String], default: [] },
      experienceStories: { type: [storySchema], default: [] },
      questionsToAsk: { type: [String], default: [] },
      salaryNegotiationScript: { type: String, default: "" },
    },
    practiceHistory: {
      type: [practiceAttemptSchema],
      default: [],
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    lastEvaluatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

interviewPrepSchema.index({ user: 1, application: 1 }, { unique: true });

const InterviewPrep =
  mongoose.models.InterviewPrep || mongoose.model("InterviewPrep", interviewPrepSchema);

export default InterviewPrep;
