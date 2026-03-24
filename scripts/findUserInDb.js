import mongoose from "mongoose";
import User from "../src/models/User.js";

const mongoUri = process.env.LIVE_MONGODB_URI || process.env.MONGODB_URI;
const targetEmail = "devendrareddym23@gmail.com";

async function run() {
  try {
    if (!mongoUri) {
      throw new Error("LIVE_MONGODB_URI or MONGODB_URI is missing.");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    const dbName = mongoose.connection.name;
    console.log("Connected DB name:", dbName);

    const users = await User.find({}, "name email plan subscriptionStatus createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    console.log("Recent users:");
    console.log(
      users.map((u) => ({
        id: String(u._id),
        email: u.email,
        name: u.name,
        plan: u.plan,
        subscriptionStatus: u.subscriptionStatus || "",
      }))
    );

    const exactUser = await User.findOne({
      email: targetEmail.toLowerCase().trim(),
    });

    console.log(
      "Exact email lookup:",
      exactUser
        ? {
            id: String(exactUser._id),
            email: exactUser.email,
            name: exactUser.name,
            plan: exactUser.plan,
            subscriptionStatus: exactUser.subscriptionStatus || "",
          }
        : "NOT_FOUND"
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Find user failed:", error.message);
    process.exit(1);
  }
}

run();
