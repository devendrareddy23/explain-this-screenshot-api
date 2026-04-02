import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { getResumeVariantAnalytics } from "../services/resumeExperimentService.js";
import { syncJobWorkflowState } from "../services/workflowService.js";

export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user._id }).sort({ appliedAt: -1 });
    const analytics = await getResumeVariantAnalytics(req.user._id, req.user.email);

    return res.status(200).json({
      success: true,
      applications,
      analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load applications.",
      error: error.message,
    });
  }
};

export const getRecentApplications = async (req, res) => {
  try {
    const applications = await Application.find({ user: req.user._id })
      .sort({ appliedAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      applications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load recent applications.",
      error: error.message,
    });
  }
};

export const updateApplicationLifecycle = async (req, res) => {
  try {
    const { id } = req.params;
    const { lifecycleStatus } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const allowed = ["Applied", "Viewed", "Interview", "Offer", "Negotiating", "Rejected"];

    if (!allowed.includes(String(lifecycleStatus))) {
      return res.status(400).json({
        success: false,
        message: "Invalid lifecycle status.",
      });
    }

    const application = await Application.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    application.lifecycleStatus = lifecycleStatus;
    application.respondedAt = ["Viewed", "Interview", "Offer", "Negotiating"].includes(lifecycleStatus)
      ? application.respondedAt || new Date()
      : application.respondedAt;
    await application.save();

    const analytics = await getResumeVariantAnalytics(req.user._id, req.user.email);

    return res.status(200).json({
      success: true,
      message: "Application updated.",
      application,
      analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update application.",
      error: error.message,
    });
  }
};

export const retryApplicationAttempt = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const application = await Application.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    const job = await Job.findOne({
      _id: application.job,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Linked job not found for retry.",
      });
    }

    const existingAppliedApplication = await Application.findOne({
      user: req.user._id,
      _id: { $ne: application._id },
      $or: [
        { job: job._id },
        ...(job?.jobId ? [{ jobId: job.jobId }] : []),
      ],
      status: "applied",
    });

    if (existingAppliedApplication) {
      return res.status(409).json({
        success: false,
        message: "This job is already marked as applied.",
      });
    }

    const canRetryAuto =
      application.status === "failed" &&
      job?.sourceCapabilities?.autoApplySupported === true &&
      job?.manualActionRequired !== true;
    const canRetryManual =
      application.status === "failed" &&
      (job?.manualActionRequired === true || job?.manualActionNeeded === true);

    if (!canRetryAuto && !canRetryManual) {
      return res.status(400).json({
        success: false,
        message: "Retry is only available for failed, recoverable application attempts.",
      });
    }

    application.retryAttemptCount = Number(application.retryAttemptCount || 0) + 1;
    application.lastRetryAt = new Date();
    await application.save();

    if (canRetryManual) {
      job.manualActionNeeded = true;
      job.manualActionRequired = true;
      job.manualApplyInProgress = true;
      job.manualApplyStartedAt = new Date();
      job.manualActionReason =
        job.manualActionReason ||
        "This source still needs a manual submission step. Complete it and then mark the job applied.";
      syncJobWorkflowState(job);
      await job.save();

      return res.status(200).json({
        success: true,
        mode: "manual",
        message: "Manual retry is ready. Open the job and complete the application.",
        application,
        job: {
          _id: String(job._id),
          applyUrl: job.applyUrl || job.jobUrl || "",
          manualActionReason: job.manualActionReason || "",
        },
      });
    }

    return res.status(200).json({
      success: true,
      mode: "auto",
      message: "Retry is ready. HireFlow will attempt the application again now.",
      application,
      job: {
        _id: String(job._id),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to prepare retry.",
      error: error.message,
    });
  }
};
