import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";

dotenv.config();

const run = async () => {
  try {
    console.log("Using DB URI:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    const email = "devendrareddym23@gmail.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found");
      process.exit(1);
    }

    console.log("Before:", {
      id: user._id.toString(),
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus || ""
    });

    user.plan = "pro";
    user.subscriptionStatus = "active";

    await user.save();

    console.log("After:", {
      id: user._id.toString(),
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus || ""
    });

    process.exit(0);
  } catch (error) {
    console.error("Manual upgrade failed:", error.message);
    process.exit(1);
  }
};

run();
