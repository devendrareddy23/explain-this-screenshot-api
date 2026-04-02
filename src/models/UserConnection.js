import mongoose from "mongoose";

const userConnectionSchema = new mongoose.Schema(
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
    source: {
      type: String,
      enum: ["linkedin", "manual"],
      default: "manual",
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
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
    relationship: {
      type: String,
      default: "",
      trim: true,
    },
    linkedinUrl: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userConnectionSchema.index({ user: 1, company: 1, fullName: 1 }, { unique: true });

const UserConnection =
  mongoose.models.UserConnection || mongoose.model("UserConnection", userConnectionSchema);

export default UserConnection;
