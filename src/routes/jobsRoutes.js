import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import User from "../models/User.js";
import UserPreference from "../models/UserPreference.js";
import Application from "../models/Application.js";
import SkippedJob from "../models/SkippedJob.js";
import protect from "../middleware/protect.js";
import { searchScoreAndStoreJobs } from "../services/jobSearchService.js";
import { generateResumeVariants } from "../services/resumeService.js";
import { generateCoverLetter as generateCoverLetterText } from "../services/coverLetterService.js";
import { recordApplication } from "../services/applicationService.js";
import { appendWorkflowEvent, getWorkflowSummary, syncJobWorkflowState } from "../services/workflowService.js";
import { sendApplicationStatusEmail } from "../services/applicationNotificationService.js";
import { chooseResumeVariantForJob, getResumeVariantAnalytics } from "../services/resumeExperimentService.js";
import RecruiterOutreach from "../models/RecruiterOutreach.js";
import { buildCompanyIntelligence } from "../services/companyIntelligenceService.js";
import { getSourceAdapterRegistry } from "../services/jobSourceAdapterRegistry.js";
import { getSourceCatalogByCategory, getSupportedSourceCatalog } from "../services/jobSourceMetadataService.js";
import { generateReferralAssistForJob, getReferralAssistForJob } from "../controllers/referralAssistController.js";

const router = express.Router();

async function getExcludedJobIdsForUser(userId) {
  const [skippedJobs, appliedJobs] = await Promise.all([
    SkippedJob.find({ userId }).select("jobId").lean(),
    Application.find({ user: userId }).select("jobId job").lean(),
  ]);

  return new Set(
    [
      ...skippedJobs.map((item) => String(item.jobId || "").trim()),
      ...appliedJobs.flatMap((item) => [item.jobId, item.job].map((value) => String(value || "").trim())),
    ].filter(Boolean)
  );
}

function filterJobsByExcludedIds(jobs = [], excludedIds = new Set()) {
  return jobs.filter((job) => {
    const candidates = [
      String(job?._id || "").trim(),
      String(job?.jobId || "").trim(),
    ].filter(Boolean);

    return !candidates.some((candidate) => excludedIds.has(candidate));
  });
}

function deriveWorkType(job = {}) {
  const explicitWorkType = String(job?.workType || job?.workMode || job?.employmentType || "").toLowerCase();
  const locationText = String(job?.location || "").toLowerCase();

  if (explicitWorkType.includes("hybrid") || locationText.includes("hybrid")) {
    return "hybrid";
  }

  if (
    explicitWorkType.includes("onsite") ||
    explicitWorkType.includes("on-site") ||
    explicitWorkType.includes("office") ||
    locationText.includes("onsite") ||
    locationText.includes("on-site")
  ) {
    return "onsite";
  }

  if (job?.remote || explicitWorkType.includes("remote") || locationText.includes("remote")) {
    return "remote";
  }

  return "";
}

async function buildVisibleJobsSummary(userId, jobs = []) {
  const summary = getWorkflowSummary(jobs);
  summary.totalApplicationsSent = await Application.countDocuments({ user: userId });
  return summary;
}

function serializeJobForClient(job = {}) {
  return {
    _id: String(job?._id || ""),
    jobId: String(job?.jobId || ""),
    title: String(job?.title || ""),
    company: String(job?.company || ""),
    location: String(job?.location || ""),
    workType: deriveWorkType(job),
    matchScore: Number(job?.matchScore || job?.score || 0),
    aiScore10: Number(job?.aiScore10 || 0),
    description: String(job?.description || ""),
    applyUrl: String(job?.applyUrl || job?.jobUrl || ""),
    jobUrl: String(job?.jobUrl || job?.applyUrl || ""),
    source: String(job?.source || ""),
    remote: Boolean(job?.remote),
    skipped: Boolean(job?.skipped),
    applied: Boolean(job?.applied),
    manualActionRequired: Boolean(job?.manualActionRequired),
    manualActionNeeded: Boolean(job?.manualActionNeeded),
    manualApplyInProgress: Boolean(job?.manualApplyInProgress),
    manualActionReason: String(job?.manualActionReason || ""),
    sourceCapabilities: job?.sourceCapabilities || {
      searchSupported: true,
      shortlistSupported: true,
      autoApplySupported: false,
    },
    createdAt: job?.createdAt || null,
    updatedAt: job?.updatedAt || null,
    appliedAt: job?.appliedAt || null,
    salaryMin: Number.isFinite(Number(job?.salaryMin)) ? Number(job.salaryMin) : null,
    salaryMax: Number.isFinite(Number(job?.salaryMax)) ? Number(job.salaryMax) : null,
    salaryCurrency: String(job?.salaryCurrency || ""),
    coverLetterText: String(job?.coverLetterText || ""),
    tailoredResumeText: String(job?.tailoredResumeText || ""),
    resumeVariants: Array.isArray(job?.resumeVariants) ? job.resumeVariants : [],
    selectedResumeVariant: String(job?.selectedResumeVariant || ""),
    workflowState: String(job?.workflowState || ""),
    workflowTimeline: Array.isArray(job?.workflowTimeline) ? job.workflowTimeline : [],
    reasons: Array.isArray(job?.reasons) ? job.reasons : [],
    aiMatchLabel: String(job?.aiMatchLabel || ""),
    aiScoreBreakdown: job?.aiScoreBreakdown || null,
  };
}

async function skipJobForUser(jobId, email, userId) {
  const normalizedJobId = String(jobId || "").trim();

  if (!normalizedJobId) {
    return {
      status: 400,
      payload: {
        success: false,
        message: "Invalid job id.",
      },
    };
  }

  let job = null;

  if (mongoose.Types.ObjectId.isValid(normalizedJobId)) {
    job = await Job.findOne({
      _id: normalizedJobId,
      profileEmail: email,
    });
  }

  if (!job) {
    job = await Job.findOne({
      jobId: normalizedJobId,
      profileEmail: email,
    });
  }

  if (job) {
    job.skipped = true;
    job.skippedAt = new Date();
    job.manualActionNeeded = false;
    job.manualActionRequired = false;
    job.manualApplyInProgress = false;
    job.manualActionReason = "";
    syncJobWorkflowState(job);

    await job.save();
  }

  if (!userId) {
    return {
      status: 400,
      payload: {
        success: false,
        message: "User id missing from auth context.",
      },
    };
  }

  await SkippedJob.findOneAndUpdate(
    {
      userId,
      jobId: job?.jobId || normalizedJobId,
    },
    {
      userId,
      jobId: job?.jobId || normalizedJobId,
      skippedAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    status: 200,
    payload: {
      success: true,
    },
  };
}

async function handleJobSearch(req, res) {
  try {
    const preference = await UserPreference.findOne({ user: req.user._id });
    const input = req.method === "GET" ? req.query : req.body;
    const {
      search = "",
      location = "",
      country = "in",
      remoteOnly = true,
      profileEmail,
      workTypes = [],
      minimumMatchScore,
    } = input || {};

    const resolvedProfileEmail = profileEmail || req.user?.email;
    const resolvedRoles =
      typeof search === "string" && search.trim()
        ? search
        : (preference?.preferredRoles || []).join(", ");
    const resolvedLocations =
      typeof location === "string" && location.trim()
        ? location
        : (preference?.preferredLocations || []).join(", ");
    const resolvedCountry = country || preference?.country || "in";
    const resolvedWorkTypes =
      Array.isArray(workTypes) && workTypes.length
        ? workTypes
        : preference?.workTypes || [];
    const resolvedRemoteOnly =
      typeof remoteOnly === "boolean"
        ? remoteOnly
        : String(remoteOnly).toLowerCase() === "true"
          ? true
          : String(remoteOnly).toLowerCase() === "false"
            ? false
            : resolvedWorkTypes.length === 1 && resolvedWorkTypes[0] === "remote";
    const resolvedMinimumMatchScore =
      Number(minimumMatchScore) ||
      Number(preference?.minimumMatchScore) ||
      80;

    const excludedIds = await getExcludedJobIdsForUser(req.user._id);

    const result = await searchScoreAndStoreJobs({
      search: resolvedRoles,
      location: resolvedLocations,
      country: resolvedCountry,
      remoteOnly: resolvedRemoteOnly,
      workTypes: resolvedWorkTypes,
      profileEmail: resolvedProfileEmail,
      minimumScore: resolvedMinimumMatchScore,
      expectedSalaryMin: preference?.expectedSalaryMin ?? null,
      companySizePreference: preference?.companySizePreference || "any",
      preferredRoles: preference?.preferredRoles || [],
      preferredLocations: preference?.preferredLocations || [],
      careerDna: preference?.careerDna || null,
      excludedJobIds: [...excludedIds],
    });

    const filteredJobs = filterJobsByExcludedIds(result?.jobs || [], excludedIds);
    const normalizedJobs = filteredJobs.map(serializeJobForClient);

    console.log("Jobs returned:", normalizedJobs.length, normalizedJobs[0] || null);

    return res.status(200).json({
      success: true,
      ...result,
      total: normalizedJobs.length,
      totalFinal: normalizedJobs.length,
      jobs: normalizedJobs,
      usedProfileEmail: resolvedProfileEmail,
      shortlistThreshold: resolvedMinimumMatchScore,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search jobs.",
      error: error.message,
    });
  }
}

/**
 * POST /api/jobs/search
 */
router.get("/search", protect, handleJobSearch);
router.post("/search", protect, handleJobSearch);

/**
 * GET /api/jobs/stored
 */
router.get("/stored", protect, async (req, res) => {
  try {
    const [jobs, excludedIds] = await Promise.all([
      Job.find({ profileEmail: req.user.email }).sort({
        createdAt: -1,
      }),
      getExcludedJobIdsForUser(req.user._id),
    ]);
    const filteredJobs = filterJobsByExcludedIds(jobs, excludedIds);
    const normalizedJobs = filteredJobs.map(serializeJobForClient);
    const summary = await buildVisibleJobsSummary(req.user._id, filteredJobs);

    console.log("Jobs returned:", normalizedJobs.length, normalizedJobs[0] || null);

    return res.status(200).json({
      success: true,
      total: normalizedJobs.length,
      jobs: normalizedJobs,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stored jobs.",
      error: error.message,
    });
  }
});

router.get("/summary", protect, async (req, res) => {
  try {
    const [jobs, excludedIds] = await Promise.all([
      Job.find({ profileEmail: req.user.email }).sort({
        createdAt: -1,
      }),
      getExcludedJobIdsForUser(req.user._id),
    ]);
    const filteredJobs = filterJobsByExcludedIds(jobs, excludedIds);
    const summary = await buildVisibleJobsSummary(req.user._id, filteredJobs);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load jobs summary.",
      error: error.message,
    });
  }
});

router.get("/sources", protect, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      sources: getSupportedSourceCatalog(),
      groupedSources: getSourceCatalogByCategory(),
      adapterRegistry: getSourceAdapterRegistry(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load source catalog.",
      error: error.message,
    });
  }
});

router.get("/:id/referral-assist", protect, getReferralAssistForJob);
router.post("/:id/referral-assist/generate", protect, generateReferralAssistForJob);

router.get("/:id/intelligence", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const outreach = await RecruiterOutreach.findOne({
      profileEmail: req.user.email,
      jobId: job.jobId,
    });

    const intelligence = await buildCompanyIntelligence({
      job,
      outreach,
    });

    job.companyIntelligence = intelligence;
    await job.save();

    return res.status(200).json({
      success: true,
      intelligence,
      job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to build company intelligence.",
      error: error.message,
    });
  }
});

router.post("/:id/prepare", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const user = await User.findById(req.user._id).select("masterResumeText email");
    const job = await Job.findOne({
      _id: id,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (!user?.masterResumeText?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Save a master resume before preparing applications.",
      });
    }

    const safeResume = user.masterResumeText.trim();
    const safeJobDescription = String(job.description || "").trim();

    if (!safeJobDescription) {
      job.manualActionNeeded = true;
      job.manualActionRequired = true;
      job.manualActionReason = "Job description missing. Manual review required.";
      syncJobWorkflowState(job);
      await job.save();

      return res.status(200).json({
        success: true,
        message: "Job requires manual action because no description was available.",
        job,
      });
    }

    const variants = await generateResumeVariants(safeResume, safeJobDescription);
    const analytics = await getResumeVariantAnalytics(req.user._id, req.user.email);
    const selectedVariant = chooseResumeVariantForJob({
      variants,
      analytics,
      job,
    });

    job.resumeVariants = variants;
    job.selectedResumeVariant = selectedVariant.variantId || "";
    job.selectedResumeVariantReason = selectedVariant.reason || "";
    job.tailoredResumeText = selectedVariant.text || variants[0]?.text || "";
    syncJobWorkflowState(job);

    const coverLetterText = await generateCoverLetterText(
      safeResume,
      safeJobDescription,
      job.company || "",
      job.title || ""
    );
    job.coverLetterText = coverLetterText;
    syncJobWorkflowState(job);

    if (job.sourceCapabilities?.autoApplySupported === false) {
      job.manualActionNeeded = true;
      job.manualActionRequired = true;
      job.manualActionReason = "Source blocks reliable one-click apply. Manual completion required.";
    }

    syncJobWorkflowState(job);
    await job.save();

    return res.status(200).json({
      success: true,
      message: "Application assets prepared successfully.",
      job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to prepare application assets.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/jobs/:id/applied
 */
router.patch("/:id/applied", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const appliedAt = new Date();
    job.appliedAt = appliedAt;
    job.manualActionNeeded = false;
    job.manualActionRequired = false;
    job.manualApplyInProgress = false;
    job.manualActionReason = "";

    await recordApplication({
      userId: req.user._id,
      profileEmail: req.user.email,
      job,
      status: "manual",
      lifecycleStatus: "Applied",
      resumeVariant: job.selectedResumeVariant || "",
      resumeVariantLabel:
        (job.resumeVariants || []).find((item) => item.variantId === job.selectedResumeVariant)?.label || "",
      appliedAt,
    });

    job.applied = true;
    syncJobWorkflowState(job);

    await job.save();

    const notification = await sendApplicationStatusEmail({
      to: req.user.email,
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

    return res.status(200).json({
      success: true,
      message: "Job marked as applied.",
      job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark job as applied.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/jobs/:id/in-progress
 */
router.patch("/:id/in-progress", protect, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    job.manualApplyInProgress = true;
    job.manualApplyStartedAt = new Date();

    if (job.manualActionRequired || job.manualActionNeeded) {
      appendWorkflowEvent(job, "manual_action_needed", "Manual application started.");
    } else {
      syncJobWorkflowState(job);
    }

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job marked as in progress.",
      job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark job as in progress.",
      error: error.message,
    });
  }
});

/**
 * POST /api/jobs/skip
 */
router.post("/skip", protect, async (req, res) => {
  try {
    const { jobId = "" } = req.body || {};
    const result = await skipJobForUser(jobId, req.user.email, req.user.id || req.user._id);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to skip job.",
      error: error.message,
    });
  }
});

/**
 * PATCH /api/jobs/:id/skip
 */
router.patch("/:id/skip", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await skipJobForUser(id, req.user.email, req.user.id || req.user._id);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to skip job.",
      error: error.message,
    });
  }
});

export default router;
