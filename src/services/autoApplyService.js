import cron from "node-cron";
import Application from "../models/Application.js";
import AutoApplyPreference from "../models/AutoApplyPreference.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import UserPreference from "../models/UserPreference.js";
import { searchScoreAndStoreJobs } from "./jobSearchService.js";
import { generateResumeVariants } from "./resumeService.js";
import { generateCoverLetter } from "./coverLetterService.js";
import { recordApplication } from "./applicationService.js";
import { sendApplicationStatusEmail, sendCronSummaryEmail } from "./applicationNotificationService.js";
import {
  sendDailyDigestIfNeeded,
  sendNearLimitAlertIfNeeded,
  sendWeeklyCareerIntelligenceIfNeeded,
} from "./notificationAutomationService.js";
import { appendWorkflowEvent, syncJobWorkflowState } from "./workflowService.js";
import { chooseResumeVariantForJob, getResumeVariantAnalytics } from "./resumeExperimentService.js";

let isCronRunning = false;
const AUTO_APPLY_SCORE_THRESHOLD = 7.5;
const AUTO_APPLY_HARD_RUN_CAP = 10;
const AUTO_APPLY_SUBMISSION_DELAY_MS = 1200;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getResumeText = (user) => {
  return String(user?.masterResumeText || user?.savedResumeText || user?.resumeText || "").trim();
};

const getPlanApplicationLimit = (user) => {
  if (user?.plan === "pro") {
    return 100;
  }

  return 5;
};

const getEffectiveScore10 = (job) => {
  const aiScore = Number(job?.aiScore10 || 0);
  if (aiScore > 0) {
    return aiScore;
  }

  return Number(job?.matchScore || 0) / 10;
};

const buildPreferenceFromAutoApplyPreference = (autoApplyPreference) => ({
  user: autoApplyPreference?.user || null,
  preferredRoles: autoApplyPreference?.search
    ? String(autoApplyPreference.search)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [],
  preferredLocations: autoApplyPreference?.location
    ? [String(autoApplyPreference.location).trim()].filter(Boolean)
    : [],
  workTypes: autoApplyPreference?.remoteOnly ? ["remote"] : [],
  country: autoApplyPreference?.country || "in",
  minimumMatchScore: 80,
  expectedSalaryMin: null,
  companySizePreference: "any",
});

const runSearchForUserPreference = async (user, preference) => {
  return searchScoreAndStoreJobs({
    search: (preference.preferredRoles || []).join(", "),
    location: (preference.preferredLocations || []).join(", "),
    country: preference.country || "in",
    remoteOnly:
      Array.isArray(preference.workTypes) &&
      preference.workTypes.length === 1 &&
      preference.workTypes[0] === "remote",
    workTypes: preference.workTypes || [],
    profileEmail: user.email,
    minimumScore: Number(preference.minimumMatchScore) || 80,
    expectedSalaryMin: preference.expectedSalaryMin ?? null,
    companySizePreference: preference.companySizePreference || "any",
    preferredRoles: preference.preferredRoles || [],
    preferredLocations: preference.preferredLocations || [],
  });
};

const resolveAutoApplyTargets = async () => {
  const [autoApplyPreferences, userPreferences] = await Promise.all([
    AutoApplyPreference.find({ enabled: true }).sort({ updatedAt: -1 }).lean(),
    UserPreference.find({}).sort({ updatedAt: -1 }).lean(),
  ]);

  const preferenceByUserId = new Map(
    userPreferences.map((preference) => [String(preference.user), preference])
  );

  if (autoApplyPreferences.length) {
    return autoApplyPreferences.map((autoApplyPreference) => ({
      autoApplyPreference,
      preference:
        preferenceByUserId.get(String(autoApplyPreference.user)) ||
        buildPreferenceFromAutoApplyPreference(autoApplyPreference),
    }));
  }

  return userPreferences.map((preference) => ({
    autoApplyPreference: null,
    preference,
  }));
};

const updateAutoApplyPreferenceRun = async ({ autoApplyPreference, status, message, appliedCount = 0 }) => {
  if (!autoApplyPreference?._id) {
    return;
  }

  await AutoApplyPreference.findByIdAndUpdate(autoApplyPreference._id, {
    $set: {
      lastRunAt: new Date(),
      lastRunStatus: status,
      lastRunMessage: message,
      lastAppliedCount: appliedCount,
    },
    $inc: {
      totalAppliedCount: appliedCount,
    },
  });
};

const isCronAutoApplyAllowed = (job) => {
  if (job?.sourceCapabilities?.autoApplySupported === true && job?.manualActionRequired !== true) {
    return true;
  }

  return false;
};

const autoApplyEligibleJobs = async ({
  user,
  resumeText,
  remainingApplications,
  maxApplicationsPerRun,
}) => {
  const queueJobs = await Job.find({
    profileEmail: user.email,
    applied: false,
    skipped: { $ne: true },
  }).sort({ createdAt: -1 });

  const profileEmailMatchCount = await Job.countDocuments({ profileEmail: user.email });
  const scoreSnapshots = queueJobs.map((job) => ({
    id: String(job._id),
    title: job.title || "Untitled role",
    source: job.source || "Unknown source",
    score10: Number(getEffectiveScore10(job).toFixed(1)),
    manualActionRequired: Boolean(job.manualActionRequired),
  }));
  const scorePassingJobs = queueJobs.filter((job) => getEffectiveScore10(job) >= AUTO_APPLY_SCORE_THRESHOLD);
  const manualBlockedJobs = scorePassingJobs.filter((job) => !isCronAutoApplyAllowed(job));
  const eligibleJobs = scorePassingJobs.filter((job) => isCronAutoApplyAllowed(job));

  console.log(`[AUTO_APPLY] User match check: ${user._id} -> ${user.email}`);
  console.log(`[AUTO_APPLY] Total jobs stored for profileEmail ${user.email}: ${profileEmailMatchCount}`);
  console.log(`[AUTO_APPLY] Total jobs in queue: ${queueJobs.length}`);
  console.log(`[AUTO_APPLY] Match scores:`, scoreSnapshots);
  console.log(`[AUTO_APPLY] Threshold set to: ${AUTO_APPLY_SCORE_THRESHOLD}`);
  console.log(`[AUTO_APPLY] Jobs passing score threshold: ${scorePassingJobs.length}`);
  console.log(`[AUTO_APPLY] Jobs blocked by manual-action rules: ${manualBlockedJobs.length}`);
  console.log(`[AUTO_APPLY] Eligible jobs found: ${eligibleJobs.length}`);

  const analytics = await getResumeVariantAnalytics(user._id, user.email);
  const appliedJobs = [];
  const errors = [];
  let skipped = 0;
  const requestedBudget = Math.max(
    0,
    Math.min(Number(maxApplicationsPerRun || 0), Number(remainingApplications || 0))
  );
  const applicationBudget = Math.min(requestedBudget, AUTO_APPLY_HARD_RUN_CAP);
  const processedJobRefs = new Set();

  if (requestedBudget > AUTO_APPLY_HARD_RUN_CAP) {
    console.log(
      `[AUTO_APPLY] Per-run hard cap reached for ${user.email}: requested ${requestedBudget}, capped at ${AUTO_APPLY_HARD_RUN_CAP}`
    );
  }

  if (applicationBudget <= 0) {
    return {
      queueCount: queueJobs.length,
      appliedJobs,
      appliedCount: 0,
      skippedCount: queueJobs.length,
      errors,
    };
  }

  for (const job of eligibleJobs) {
    if (appliedJobs.length >= applicationBudget) {
      if (appliedJobs.length === applicationBudget) {
        console.log(
          `[AUTO_APPLY] Per-run apply budget reached for ${user.email}: ${applicationBudget} applications attempted this run`
        );
      }
      skipped += 1;
      continue;
    }

    try {
      const effectiveScore10 = getEffectiveScore10(job);
      const stableJobId = String(job.jobId || "").trim();
      const processedRef = stableJobId || String(job._id || "").trim();

      if (processedRef && processedJobRefs.has(processedRef)) {
        skipped += 1;
        console.log(
          `[AUTO_APPLY] Skipping duplicate job in same run for ${user.email}: ${job.title || "Untitled role"}`
        );
        continue;
      }

      if (processedRef) {
        processedJobRefs.add(processedRef);
      }

      const existingApplication = await Application.exists({
        user: user._id,
        $or: [
          { job: job._id },
          ...(stableJobId ? [{ jobId: stableJobId }] : []),
        ],
      });

      if (existingApplication) {
        skipped += 1;
        console.log(
          `[AUTO_APPLY] Skipping ${job.title || "Untitled role"} for ${user.email}: already applied`
        );
        continue;
      }

      const jobDescription = job.description || "";
      const variants = await generateResumeVariants(resumeText, jobDescription);
      const selectedVariant = chooseResumeVariantForJob({
        variants,
        analytics,
        job,
      });
      const coverLetter = await generateCoverLetter(
        resumeText,
        jobDescription,
        job.company || "",
        job.title || ""
      );
      const appliedAt = new Date();
      const nextJobState = {
        resumeVariants: variants,
        selectedResumeVariant: selectedVariant.variantId || "",
        selectedResumeVariantReason: selectedVariant.reason || "",
        tailoredResumeText: selectedVariant.text || variants[0]?.text || "",
        coverLetterText: coverLetter,
        applied: true,
        appliedAt,
        appliedByUserId: user._id,
        notes: job.notes ? `${job.notes}\nAuto-applied by 6-hour cron.` : "Auto-applied by 6-hour cron.",
        manualActionNeeded: false,
        manualActionRequired: false,
        manualApplyInProgress: false,
        manualActionReason: "",
      };
      const workflowJob = job.toObject();
      Object.assign(workflowJob, nextJobState);
      syncJobWorkflowState(workflowJob);
      const recordJob = {
        ...job.toObject(),
        ...nextJobState,
      };

      await recordApplication({
        userId: user._id,
        profileEmail: user.email,
        job: recordJob,
        status: "applied",
        lifecycleStatus: "Applied",
        resumeVariant: recordJob.selectedResumeVariant || "",
        resumeVariantLabel:
          (recordJob.resumeVariants || []).find((item) => item.variantId === recordJob.selectedResumeVariant)
            ?.label || "",
        matchScore: Number(recordJob.matchScore || Math.round(effectiveScore10 * 10)),
        autoApplied: true,
        appliedAt,
      });

      const updatedJob = await Job.findOneAndUpdate(
        {
          profileEmail: user.email,
          ...(stableJobId ? { jobId: stableJobId } : { _id: job._id }),
          applied: false,
        },
        {
          $set: {
            ...nextJobState,
            workflowState: workflowJob.workflowState,
            workflowTimeline: workflowJob.workflowTimeline,
          },
        },
        {
          new: true,
        }
      );

      if (!updatedJob) {
        throw new Error("Job was refreshed before cron could be marked applied.");
      }

      const notification = await sendApplicationStatusEmail({
        to: user.email,
        company: updatedJob.company,
        role: updatedJob.title,
        source: updatedJob.source,
        status: "applied",
        appliedAt: updatedJob.appliedAt,
      });
      await Job.findByIdAndUpdate(updatedJob._id, {
        $set: {
          applicationNotificationStatus: notification.success ? "sent" : "failed",
          applicationNotificationSentAt: notification.success ? new Date() : null,
          applicationNotificationError: notification.success
            ? ""
            : notification.message || "Notification failed.",
        },
      });

      appliedJobs.push({
        id: updatedJob._id,
        title: updatedJob.title,
        company: updatedJob.company,
        location: updatedJob.location,
        source: updatedJob.source,
        matchScore: Number(updatedJob.matchScore || Math.round(effectiveScore10 * 10)),
        resumeVersion: updatedJob.selectedResumeVariant || "",
        autoApplied: true,
      });

      console.log(
        `[AUTO_APPLY] Applied ${user.email} -> ${job.title || "Untitled role"} @ ${job.company || "Unknown company"}`
      );

      if (appliedJobs.length < applicationBudget) {
        await delay(AUTO_APPLY_SUBMISSION_DELAY_MS);
      }
    } catch (error) {
      skipped += 1;
      try {
        job.workflowState = "failed";
        appendWorkflowEvent(job, "failed", error.message || "Auto apply failed.");
        await job.save();
      } catch (statusError) {
        console.error(
          `[AUTO_APPLY] Failed to persist failed status for ${job.title || "Untitled role"}:`,
          statusError.message
        );
      }
      errors.push({
        jobId: String(job._id),
        message: error.message || "Unknown apply error.",
      });
      console.error(
        `[AUTO_APPLY] Failed ${user.email} -> ${job.title || "Untitled role"}:`,
        error.message
      );
    }
  }

  console.log(`[AUTO_APPLY] Applied: ${appliedJobs.length}`);

  return {
    queueCount: queueJobs.length,
    appliedJobs,
    appliedCount: appliedJobs.length,
    skippedCount: skipped,
    errors,
  };
};

export const runAutoApplyForUserPreference = async ({ user, preference, autoApplyPreference = null }) => {
  const resumeText = getResumeText(user);

  if (!resumeText) {
    const message = "Skipped because user has no saved master resume.";
    await updateAutoApplyPreferenceRun({
      autoApplyPreference,
      status: "skipped",
      message,
      appliedCount: 0,
    });

    return {
      success: false,
      skipped: true,
      message,
      appliedJobs: [],
      totalFetched: 0,
      appliedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  const planLimit = getPlanApplicationLimit(user);
  const applicationsUsed = await Application.countDocuments({ user: user._id });
  const remainingApplications = Math.max(0, planLimit - applicationsUsed);

  if (remainingApplications <= 0) {
    const message = `Skipped because ${user.email} has reached the ${planLimit} application plan limit.`;
    await updateAutoApplyPreferenceRun({
      autoApplyPreference,
      status: "skipped",
      message,
      appliedCount: 0,
    });

    return {
      success: false,
      skipped: true,
      message,
      appliedJobs: [],
      totalFetched: 0,
      appliedCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }

  const searchResult = await runSearchForUserPreference(user, preference);
  const maxApplicationsPerRun = Math.max(
    1,
    Math.min(
      Number(autoApplyPreference?.maxApplicationsPerRun || 5),
      remainingApplications
    )
  );

  const applyResult = await autoApplyEligibleJobs({
    user,
    resumeText,
    remainingApplications,
    maxApplicationsPerRun,
  });

  await sendCronSummaryEmail({
    to: user.email,
    appliedJobs: applyResult.appliedJobs,
    totalFetched: Number(searchResult?.totalFinal || searchResult?.total || 0),
  });

  await Promise.allSettled([
    sendDailyDigestIfNeeded({ user }),
    sendNearLimitAlertIfNeeded({ user }),
    sendWeeklyCareerIntelligenceIfNeeded({ user }),
  ]);

  const message = `Fetched ${Number(searchResult?.totalFinal || searchResult?.total || 0)} jobs and auto-applied ${applyResult.appliedCount}.`;

  await updateAutoApplyPreferenceRun({
    autoApplyPreference,
    status: applyResult.errors.length ? "failed" : "success",
    message,
    appliedCount: applyResult.appliedCount,
  });

  return {
    success: applyResult.errors.length === 0,
    skipped: false,
    message,
    appliedJobs: applyResult.appliedJobs,
    totalFetched: Number(searchResult?.totalFinal || searchResult?.total || 0),
    appliedCount: applyResult.appliedCount,
    skippedCount: applyResult.skippedCount,
    queueCount: applyResult.queueCount,
    errors: applyResult.errors,
  };
};

export const runDailyAutoApplyBatch = async () => {
  if (isCronRunning) {
    const message = "Auto-apply cron skipped: already running.";
    console.log(message);
    return {
      success: false,
      skipped: true,
      applied: 0,
      skippedCount: 0,
      errors: [message],
      usersProcessed: 0,
    };
  }

  isCronRunning = true;

  const summary = {
    success: true,
    skipped: false,
    applied: 0,
    skippedCount: 0,
    usersProcessed: 0,
    usersConsidered: 0,
    errors: [],
  };

  try {
    const targets = await resolveAutoApplyTargets();
    summary.usersConsidered = targets.length;
    console.log(`[AUTO_APPLY] Targets found: ${targets.length}`);

    for (const target of targets) {
      const { preference, autoApplyPreference } = target;

      try {
        const user = await User.findById(preference.user).select(
          "email plan status masterResumeText savedResumeText resumeText"
        );

        if (!user) {
          summary.skippedCount += 1;
          continue;
        }

        if (user.plan !== "pro" || user.status !== "active") {
          summary.skippedCount += 1;
          console.log(
            `[AUTO_APPLY] Skipping ${user.email}: requires active pro plan.`
          );
          continue;
        }

        summary.usersProcessed += 1;
        const result = await runAutoApplyForUserPreference({
          user,
          preference,
          autoApplyPreference,
        });

        summary.applied += Number(result.appliedCount || 0);
        summary.skippedCount += Number(result.skippedCount || 0);
        if (result.skipped) {
          summary.skippedCount += 1;
        }

        if (Array.isArray(result.errors) && result.errors.length) {
          summary.errors.push(
            ...result.errors.map((item) => `${user.email}: ${item.message || item}`)
          );
          summary.success = false;
        }

        console.log(`[AUTO_APPLY] Result for ${user.email}: ${result.message}`);
      } catch (error) {
        const message = `User auto-apply failed for ${String(preference.user)}: ${error.message || error}`;
        summary.errors.push(message);
        summary.success = false;
        console.error("[AUTO_APPLY]", message);
      }
    }

    return summary;
  } catch (error) {
    console.error("runDailyAutoApplyBatch error:", error.message);
    return {
      success: false,
      skipped: false,
      applied: summary.applied,
      skippedCount: summary.skippedCount,
      usersProcessed: summary.usersProcessed,
      usersConsidered: summary.usersConsidered,
      errors: [...summary.errors, error.message || "Unknown batch error."],
    };
  } finally {
    isCronRunning = false;
  }
};

export const startAutoApplyCron = () => {
  const cronEnabled = process.env.AUTO_APPLY_CRON_ENABLED !== "false";
  const cronExpr = process.env.AUTO_APPLY_CRON_EXPRESSION || "0 */6 * * *";

  if (!cronEnabled) {
    console.log("Auto-apply cron is disabled. Set AUTO_APPLY_CRON_ENABLED=true to enable.");
    return;
  }

  cron.schedule(cronExpr, async () => {
    console.log("=== CRON JOB STARTED ===", new Date().toISOString());
    try {
      const summary = await runDailyAutoApplyBatch();
      console.log("=== CRON JOB COMPLETED ===", summary);
    } catch (error) {
      console.error("=== CRON JOB FAILED ===", error);
    }
  });

  console.log(`Auto-apply cron started with expression: ${cronExpr}`);
};
