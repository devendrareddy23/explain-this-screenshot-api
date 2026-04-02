import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Application from "../models/Application.js";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({}).select("_id email").lean();

  for (const user of users) {
    const count = await Application.countDocuments({ user: user._id });
    await User.findByIdAndUpdate(user._id, {
      $set: {
        applicationsUsed: count,
      },
    });
  }

  console.log(`Fixed applicationsUsed for ${users.length} users`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Fix applicationsUsed failed:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
