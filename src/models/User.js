import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ""
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free"
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive"
    },
    stripeCustomerId: {
      type: String,
      default: ""
    },
    stripeSubscriptionId: {
      type: String,
      default: ""
    },
    dailyResumeTailorCount: {
      type: Number,
      default: 0
    },
    dailyCoverLetterCount: {
      type: Number,
      default: 0
    },
    dailyAmazonUsageCount: {
      type: Number,
      default: 0
    },
    usageLastResetAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
