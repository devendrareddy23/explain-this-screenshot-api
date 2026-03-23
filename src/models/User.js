import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    // billing / plan
    plan: {
      type: String,
      enum: ["free", "pro", "auto"],
      default: "free",
    },
    stripeCustomerId: {
      type: String,
      default: "",
    },
    stripeSubscriptionId: {
      type: String,
      default: "",
    },
    stripePriceId: {
      type: String,
      default: "",
    },
    subscriptionStatus: {
      type: String,
      default: "",
    },

    // daily usage tracking
    usageDate: {
      type: String,
      default: "",
    },
    resumeCount: {
      type: Number,
      default: 0,
    },
    coverLetterCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
