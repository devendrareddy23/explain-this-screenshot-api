import Application from "../models/Application.js";
import User from "../models/User.js";

export const recordApplication = async ({
  userId,
  profileEmail,
  job,
  status = "applied",
  lifecycleStatus = "Applied",
  resumeVariant = "",
  resumeVariantLabel = "",
  matchScore,
  autoApplied = false,
  appliedAt,
}) => {
  if (!userId || !profileEmail || !job?._id) {
    throw new Error("Missing application record fields.");
  }

  const applicationLookup = job?.jobId
    ? { user: userId, jobId: job.jobId }
    : { user: userId, job: job._id };

  const application = await Application.findOneAndUpdate(
    applicationLookup,
    {
      user: userId,
      profileEmail,
      job: job._id,
      jobId: job.jobId || String(job._id || ""),
      jobTitle: job.title || "",
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      source: job.source || "",
      applyUrl: job.applyUrl || job.jobUrl || "",
      status,
      lifecycleStatus,
      matchScore: Number(matchScore ?? job.matchScore ?? 0),
      autoApplied: Boolean(autoApplied),
      resumeVersion: resumeVariant || "",
      resumeVariant,
      resumeVariantLabel,
      appliedAt: appliedAt || job.appliedAt || new Date(),
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const applicationsUsed = await Application.countDocuments({ user: userId });
  await User.findByIdAndUpdate(userId, {
    $set: {
      applicationsUsed,
    },
  });

  return application;
};
