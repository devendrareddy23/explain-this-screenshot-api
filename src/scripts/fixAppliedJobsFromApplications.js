import "dotenv/config";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const applications = await Application.find({})
    .select("user profileEmail job jobId appliedAt")
    .lean();

  let fixed = 0;

  for (const application of applications) {
    const stableJobId = String(application.jobId || "").trim();
    const profileEmail = String(application.profileEmail || "").trim().toLowerCase();
    const appliedAt = application.appliedAt || new Date();

    if (!profileEmail) {
      continue;
    }

    const query = {
      profileEmail,
      $or: [
        ...(stableJobId ? [{ jobId: stableJobId }] : []),
        ...(application.job ? [{ _id: application.job }] : []),
      ],
    };

    if (!query.$or.length) {
      continue;
    }

    const result = await Job.updateMany(
      query,
      {
        $set: {
          applied: true,
          appliedAt,
          appliedByUserId: application.user || null,
        },
      }
    );

    fixed += Number(result.modifiedCount || 0);
  }

  console.log(`Fixed ${fixed} job documents`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
