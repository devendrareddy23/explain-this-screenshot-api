import cron from "node-cron";
import AutoApplyPreference from "../models/AutoApplyPreference.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { searchScoreAndStoreJobs } from "./jobSearchService.js";

let isCronRunning = false;

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const shouldSkipRunToday = (lastRunAt) => {
  if (!lastRunAt) return false;

  const now = new Date();
  const last = new Date(lastRunAt);

  return (
    now.getUTCFullYear() === last.getUTCFullYear() &&
    now.getUTCMonth() === last.getUTCMonth() &&
    now.getUTCDate() === last.getUTCDate()
  );
};

/**
 * IMPORTANT:
 * This function currently "applies" by marking shortlisted jobs as applied in DB.
 *
 * If you already have a real external-apply helper in your codebase,
 * replace the marked section with your real submit logic.
 */
const applyToStoredShortlistedJobs = async ({
  profileEmail,
  maxApplicationsPerRun
}) => {
  const jobs = await Job.find({
    profileEmail,
    applied: false,
    shortlisted: true
  })
    .sort({ createdAt: -1 })
    .limit(maxApplicationsPerRun);

  let appliedCount = 0;
  const appliedJobs = [];

  for (const job of jobs) {
    try {
      /**
       * REAL APPLY HOOK:
       * If you already have a real function like submitApplication(job),
       * call it here before marking as applied.
       *
       * Example:
       * const result = await submitApplication(job);
       * if (!result.success) continue;
       */

      job.applied = true;
      job.appliedAt = new Date();
      job.notes = job.notes
        ? `${job.notes}\nAuto-applied by daily cron.`
        : "Auto-applied by daily cron.";

      await job.save();

      appliedCount += 1;
      appliedJobs.push({
        id: job._id,
        title: job.title || "",
        company: job.company || "",
        location: job.location || "",
        applyUrl: job.applyUrl || ""
      });
    } catch (error) {
      console.error("Failed to auto-apply for job:", job._id, error.message);
    }
  }

  return {
    appliedCount,
    appliedJobs
  };
};

export const runAutoApplyForPreference = async (preference) => {
  const user = await User.findById(preference.user).select("email plan status");

  if (!user) {
    await AutoApplyPreference.findByIdAndUpdate(preference._id, {
      lastRunAt: new Date(),
      lastRunStatus: "failed",
      lastRunMessage: "User not found.",
      lastAppliedCount: 0
    });

    return {
      success: false,
      skipped: false,
      message: "User not found."
    };
  }

  if (user.plan !== "pro" || user.status !== "active") {
    await AutoApplyPreference.findByIdAndUpdate(preference._id, {
      lastRunAt: new Date(),
      lastRunStatus: "skipped",
      lastRunMessage: "Skipped because user is not an active Pro subscriber.",
      lastAppliedCount: 0
    });

    return {
      success: false,
      skipped: true,
      message: "Skipped because user is not active Pro."
    };
  }

  if (!preference.enabled) {
    await AutoApplyPreference.findByIdAndUpdate(preference._id, {
      lastRunAt: new Date(),
      lastRunStatus: "skipped",
      lastRunMessage: "Skipped because auto-apply is disabled.",
      lastAppliedCount: 0
    });

    return {
      success: false,
      skipped: true,
      message: "Auto-apply disabled."
    };
  }

  if (shouldSkipRunToday(preference.lastRunAt)) {
    return {
      success: true,
      skipped: true,
      message: "Already ran today."
    };
  }

  try {
    const searchResult = await searchScoreAndStoreJobs({
      search: preference.search,
      location: preference.location,
      country: preference.country,
      remoteOnly: preference.remoteOnly,
      profileEmail: preference.profileEmail
    });

    const shortlistedCount = safeNumber(
      searchResult?.shortlistedJobs?.length,
      0
    );

    const applyResult = await applyToStoredShortlistedJobs({
      profileEmail: preference.profileEmail,
      maxApplicationsPerRun: preference.maxApplicationsPerRun
    });

    await AutoApplyPreference.findByIdAndUpdate(preference._id, {
      lastRunAt: new Date(),
      lastRunStatus: "success",
      lastRunMessage: `Fetched ${safeNumber(
        searchResult?.totalMatched,
        0
      )} matched jobs, shortlisted ${shortlistedCount}, applied ${applyResult.appliedCount}.`,
      lastAppliedCount: applyResult.appliedCount,
      $inc: {
        totalAppliedCount: applyResult.appliedCount
      }
    });

    return {
      success: true,
      skipped: false,
      searchSummary: {
        totalFetched: safeNumber(searchResult?.totalFetched, 0),
        totalMatched: safeNumber(searchResult?.totalMatched, 0),
        shortlistedCount
      },
      appliedCount: applyResult.appliedCount,
      appliedJobs: applyResult.appliedJobs,
      message: "Auto-apply completed successfully."
    };
  } catch (error) {
    console.error("runAutoApplyForPreference error:", error);

    await AutoApplyPreference.findByIdAndUpdate(preference._id, {
      lastRunAt: new Date(),
      lastRunStatus: "failed",
      lastRunMessage: error.message || "Auto-apply failed.",
      lastAppliedCount: 0
    });

    return {
      success: false,
      skipped: false,
      message: error.message || "Auto-apply failed."
    };
  }
};

export const runDailyAutoApplyBatch = async () => {
  if (isCronRunning) {
    console.log("Auto-apply cron skipped: already running.");
    return;
  }

  isCronRunning = true;

  try {
    const preferences = await AutoApplyPreference.find({
      enabled: true
    }).sort({ updatedAt: -1 });

    console.log(`Auto-apply cron started. Preferences found: ${preferences.length}`);

    for (const preference of preferences) {
      try {
        const result = await runAutoApplyForPreference(preference);
        console.log(
          `Auto-apply result for ${preference.profileEmail}:`,
          result.message
        );
      } catch (error) {
        console.error(
          `Auto-apply failed for ${preference.profileEmail}:`,
          error.message
        );
      }
    }

    console.log("Auto-apply cron finished.");
  } catch (error) {
    console.error("runDailyAutoApplyBatch error:", error.message);
  } finally {
    isCronRunning = false;
  }
};

export const startAutoApplyCron = () => {
  const cronEnabled = process.env.AUTO_APPLY_CRON_ENABLED === "true";

  if (!cronEnabled) {
    console.log("Auto-apply cron is disabled. Set AUTO_APPLY_CRON_ENABLED=true to enable.");
    return;
  }

  const cronExpr = process.env.AUTO_APPLY_CRON_EXPRESSION || "0 9 * * *";

  cron.schedule(cronExpr, async () => {
    console.log("Auto-apply cron triggered.");
    await runDailyAutoApplyBatch();
  });

  console.log(`Auto-apply cron started with expression: ${cronExpr}`);
};
