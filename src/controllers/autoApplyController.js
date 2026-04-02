import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { generateResumeVariants } from "../services/resumeService.js";
import { generateCoverLetter } from "../services/coverLetterService.js";
import { sendApplicationStatusEmail } from "../services/applicationNotificationService.js";
import { recordApplication } from "../services/applicationService.js";
import { syncJobWorkflowState } from "../services/workflowService.js";
import { chooseResumeVariantForJob, getResumeVariantAnalytics } from "../services/resumeExperimentService.js";
import { runDailyAutoApplyBatch } from "../services/autoApplyService.js";

export const autoApply = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    const rawUser = await User.collection.findOne({ _id: req.user._id });

    if (!rawUser) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (rawUser.plan !== "pro") {
      return res.status(403).json({
        success: false,
        message: "Upgrade to Pro to enable auto apply.",
      });
    }

    const resumeText = rawUser.masterResumeText || rawUser.savedResumeText || rawUser.resumeText || "";
    const requestedJobId = String(req.body?.jobId || "").trim();

    console.log("AUTO APPLY DEBUG email:", rawUser.email);
    console.log("AUTO APPLY DEBUG savedResumeText exists:", !!rawUser.savedResumeText);
    console.log("AUTO APPLY DEBUG resumeText exists:", !!rawUser.resumeText);
    console.log("AUTO APPLY DEBUG final resume length:", resumeText.length);

    if (!resumeText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resume not found. Save resume first.",
      });
    }

    const jobs = await Job.find({
      profileEmail: rawUser.email,
      applied: false,
      skipped: { $ne: true },
      ...(requestedJobId ? { _id: requestedJobId } : {}),
    }).sort({ createdAt: -1 });

    const automationReadyJobs = jobs.filter(
      (job) => job?.sourceCapabilities?.autoApplySupported === true && job?.manualActionRequired !== true
    );

    if (requestedJobId && !jobs.length) {
      return res.status(404).json({
        success: false,
        message: "Job not found or not available for auto apply.",
      });
    }

    if (requestedJobId && jobs.length && !automationReadyJobs.length) {
      const job = jobs[0];

      job.manualActionNeeded = true;
      job.manualActionRequired = true;
      job.manualActionReason =
        job.manualActionReason ||
        "This source still requires a manual application step. Open the job and mark it applied after submitting.";
      syncJobWorkflowState(job);
      await job.save();

      return res.status(409).json({
        success: false,
        message: "Manual completion required for this job source.",
        job,
      });
    }

    if (!automationReadyJobs.length) {
      return res.json({
        success: true,
        message: "No automation-ready jobs available to auto apply.",
        appliedCount: 0,
        jobs: [],
      });
    }

    const appliedJobs = [];
    const analytics = await getResumeVariantAnalytics(rawUser._id, rawUser.email);

    for (const job of automationReadyJobs) {
      const existingApplication = await Application.exists({
        user: rawUser._id,
        $or: [
          { job: job._id },
          ...(job?.jobId ? [{ jobId: job.jobId }] : []),
        ],
      });

      if (existingApplication) {
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

      job.resumeVariants = variants;
      job.selectedResumeVariant = selectedVariant.variantId || "";
      job.selectedResumeVariantReason = selectedVariant.reason || "";
      job.tailoredResumeText = selectedVariant.text || variants[0]?.text || "";
      job.coverLetterText = coverLetter;
      job.appliedAt = appliedAt;
      job.notes = "Auto applied via HireFlow AI Pro";

      await recordApplication({
        userId: rawUser._id,
        profileEmail: rawUser.email,
        job,
        status: "applied",
        lifecycleStatus: "Applied",
        resumeVariant: job.selectedResumeVariant || "",
        resumeVariantLabel:
          (job.resumeVariants || []).find((item) => item.variantId === job.selectedResumeVariant)?.label || "",
        matchScore: Number(job.matchScore || 0),
        autoApplied: true,
        appliedAt,
      });

      job.applied = true;
      job.manualActionNeeded = false;
      job.manualActionRequired = false;
      job.manualApplyInProgress = false;
      job.manualActionReason = "";
      syncJobWorkflowState(job);

      await job.save();

      const notification = await sendApplicationStatusEmail({
        to: rawUser.email,
        company: job.company,
        role: job.title,
        source: job.source,
        status: "applied",
        appliedAt: job.appliedAt,
      });

      job.applicationNotificationStatus = notification.success ? "sent" : "failed";
      job.applicationNotificationSentAt = notification.success ? new Date() : null;
      job.applicationNotificationError = notification.success
        ? ""
        : notification.message || "Notification failed.";
      await job.save();

      console.log(
        `[AUTO_APPLY] Applied ${rawUser.email} -> ${job.title || "Untitled role"} @ ${job.company || "Unknown company"}`
      );

      appliedJobs.push({
        id: job._id,
        company: job.company,
        title: job.title,
        location: job.location,
        appliedAt: job.appliedAt,
        source: job.source,
        matchScore: Number(job.matchScore || 0),
        resumeVersion: job.selectedResumeVariant || "",
        autoApplied: true,
      });
    }

    return res.json({
      success: true,
      message: requestedJobId
        ? `Applied to ${appliedJobs.length} selected job.`
        : `Auto applied to ${appliedJobs.length} jobs.`,
      appliedCount: appliedJobs.length,
      jobs: appliedJobs,
    });
  } catch (error) {
    console.error("AUTO APPLY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Auto apply failed.",
      error: error.message || "Auto apply failed.",
    });
  }
};

export const triggerAutoApplyNow = async (req, res) => {
  try {
    const summary = await runDailyAutoApplyBatch();

    return res.status(200).json({
      success: true,
      applied: Number(summary.applied || 0),
      skipped: Number(summary.skippedCount || 0),
      usersProcessed: Number(summary.usersProcessed || 0),
      usersConsidered: Number(summary.usersConsidered || 0),
      errors: Array.isArray(summary.errors) ? summary.errors : [],
    });
  } catch (error) {
    console.error("AUTO APPLY TRIGGER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to trigger auto apply.",
      applied: 0,
      skipped: 0,
      errors: [error.message || "Failed to trigger auto apply."],
    });
  }
};
