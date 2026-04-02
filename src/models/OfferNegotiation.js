import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    status: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const marketBenchmarkSchema = new mongoose.Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    midpoint: { type: Number, default: null },
    currency: { type: String, default: "" },
    comparisonSummary: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    deltaFromMarket: { type: Number, default: 0 },
    recommendationStrength: {
      type: String,
      enum: ["strong", "moderate", "neutral"],
      default: "neutral",
    },
    sources: {
      type: [sourceSchema],
      default: [],
    },
  },
  { _id: false }
);

const offerNegotiationSchema = new mongoose.Schema(
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
    currency: {
      type: String,
      default: "",
      trim: true,
    },
    initialOfferAmount: {
      type: Number,
      default: null,
    },
    currentOfferAmount: {
      type: Number,
      default: null,
    },
    finalOfferAmount: {
      type: Number,
      default: null,
    },
    marketBenchmark: {
      type: marketBenchmarkSchema,
      default: () => ({}),
    },
    negotiationScript: {
      type: String,
      default: "",
    },
    counterResponseScript: {
      type: String,
      default: "",
    },
    upliftAmount: {
      type: Number,
      default: 0,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

offerNegotiationSchema.index({ user: 1, application: 1 }, { unique: true });

const OfferNegotiation =
  mongoose.models.OfferNegotiation || mongoose.model("OfferNegotiation", offerNegotiationSchema);

export default OfferNegotiation;
