import Job from "../models/Job.js";
import { searchJobsFromAdzuna } from "../services/jobSearchService.js";

export const searchJobs = async (req, res) => {
  try {
    const {
      search = "",
      location = "",
      country = "in",
      remoteOnly = false,
      limit = 20,
    } = req.body;

    const userEmail = req.user?.email || "";

    const result = await searchJobsFromAdzuna({
      search,
      location,
      country,
      remoteOnly,
      limit,
      profileEmail: userEmail,
    });

    return res.status(200).json({
      success: true,
      totalFetched: result?.totalFetched || 0,
      totalMatched: result?.totalMatched || 0,
      jobs: result?.jobs || [],
      shortlistedJobs: result?.shortlistedJobs || [],
      usedProfileEmail: userEmail,
    });
  } catch (error) {
    console.error("searchJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search jobs.",
      error: error.message,
    });
  }
};

export const getStoredJobs = async (req, res) => {
  try {
    const userEmail = req.user?.email;

    const jobs = await Job.find({ profileEmail: userEmail }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      total: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getStoredJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stored jobs.",
      error: error.message,
    });
  }
};

export const saveJob = async (req, res) => {
  try {
    const userEmail = req.user?.email;

    const {
      jobId,
      title = "",
      company = "",
      location = "",
      description = "",
      jobUrl = "",
      applyUrl = "",
      source = "",
      sourceUrl = "",
      country = "",
      remote = false,
      employmentType = "",
      salaryMin = null,
      salaryMax = null,
      salaryCurrency = "",
      score = 0,
      matchScore = 0,
      reasons = [],
      shortlisted = false,
      rawJobData = null,
      notes = "",
    } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "jobId is required.",
      });
    }

    const existingJob = await Job.findOne({
      jobId: String(jobId),
      profileEmail: userEmail,
    });

    if (existingJob) {
      return res.status(200).json({
        success: false,
        message: "Job already saved.",
        job: existingJob,
      });
    }

    const job = await Job.create({
      jobId: String(jobId),
      profileEmail: userEmail,
      title,
      company,
      location,
      description,
      jobUrl,
      applyUrl,
      source,
      sourceUrl,
      country,
      remote,
      employmentType,
      salaryMin,
      salaryMax,
      salaryCurrency,
      score,
      matchScore,
      reasons,
      shortlisted,
      rawJobData,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Job saved successfully.",
      job,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existingJob = await Job.findOne({
        jobId: String(req.body.jobId),
        profileEmail: req.user?.email,
      });

      return res.status(200).json({
        success: false,
        message: "Job already saved.",
        job: existingJob,
      });
    }

    console.error("saveJob error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save job.",
      error: error.message,
    });
  }
};

export const markJobApplied = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const { id } = req.params;
    const { applyUrl = "" } = req.body || {};

    const job = await Job.findOneAndUpdate(
      { _id: id, profileEmail: userEmail },
      {
        applied: true,
        appliedAt: new Date(),
        skipped: false,
        skippedAt: null,
        ...(applyUrl ? { applyUrl } : {}),
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job marked as applied.",
      job,
    });
  } catch (error) {
    console.error("markJobApplied error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark job as applied.",
      error: error.message,
    });
  }
};

export const skipJob = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const { id } = req.params;

    const job = await Job.findOneAndUpdate(
      { _id: id, profileEmail: userEmail },
      {
        skipped: true,
        skippedAt: new Date(),
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job skipped successfully.",
      job,
    });
  } catch (error) {
    console.error("skipJob error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to skip job.",
      error: error.message,
    });
  }
};
