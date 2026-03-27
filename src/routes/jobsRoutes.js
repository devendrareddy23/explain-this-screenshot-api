import express from "express";
import Job from "../models/Job.js";
import { protect } from "../middleware/authMiddleware.js";
import { searchScoreAndStoreJobs } from "../services/jobSearchService.js";

const router = express.Router();

router.post("/search", protect, async (req, res) => {
  try {
    const {
      search = "",
      location = "",
      jobType = "",
      limit = 20,
      minimumScore = 0,
      country = "",
      source = "",
      remoteOnly = false,
    } = req.body || {};

    const safeSearch = String(search || "").trim();
    const safeLocation = String(location || "").trim();
    const safeJobType = String(jobType || "").trim().toLowerCase();
    const safeCountry = String(country || "").trim().toLowerCase();
    const safeSource = String(source || "").trim();

    const finalRemoteOnly =
      remoteOnly === true ||
      remoteOnly === "true" ||
      safeJobType === "remote";

    if (!safeSearch) {
      return res.status(400).json({
        success: false,
        message: "search (role/field) is required.",
      });
    }

    const userEmail = String(
      req.userEmail || req.user?.email || req.body.profileEmail || ""
    )
      .trim()
      .toLowerCase();

    const result = await searchScoreAndStoreJobs({
      search: safeSearch,
      limit: Number(limit) || 20,
      minimumScore: Number(minimumScore) || 0,
      remoteOnly: finalRemoteOnly,
      country: safeCountry || "in",
      source: safeSource,
      profileEmail: userEmail,
      jobType: safeJobType,
      location: safeLocation,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || "Failed to search jobs.",
        usedProfileEmail: userEmail,
      });
    }

    return res.status(200).json({
      success: true,
      totalFetched: result.totalFetched || 0,
      totalFinal: result.totalFinal || 0,
      jobs: Array.isArray(result.jobs) ? result.jobs : [],
      usedProfileEmail: userEmail,
    });
  } catch (error) {
    console.error("POST /api/jobs/search error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search jobs.",
      error: error.message,
    });
  }
});

router.post("/save", protect, async (req, res) => {
  try {
    const {
      jobId = "",
      title = "",
      company = "",
      location = "",
      description = "",
      jobUrl = "",
      applyUrl = "",
      source = "Adzuna",
      sourceUrl = "",
      country = "in",
      remote = false,
      employmentType = "",
      salaryMin = null,
      salaryMax = null,
      salaryCurrency = "",
      matchScore = 0,
      score = 0,
      reasons = [],
      shortlisted = false,
      rawJobData = null,
      notes = "",
    } = req.body || {};

    const userEmail = String(req.userEmail || req.user?.email || "")
      .trim()
      .toLowerCase();

    if (!jobId || !title) {
      return res.status(400).json({
        success: false,
        message: "jobId and title are required.",
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

    const newJob = await Job.create({
      jobId: String(jobId),
      profileEmail: userEmail,
      title: String(title),
      company: String(company),
      location: String(location),
      description: String(description),
      jobUrl: String(jobUrl),
      applyUrl: String(applyUrl),
      source: String(source),
      sourceUrl: String(sourceUrl),
      country: String(country).toLowerCase(),
      remote: Boolean(remote),
      employmentType: String(employmentType),
      salaryMin: salaryMin ?? null,
      salaryMax: salaryMax ?? null,
      salaryCurrency: String(salaryCurrency),
      matchScore: Number(matchScore) || 0,
      score: Number(score) || 0,
      reasons: Array.isArray(reasons) ? reasons : [],
      shortlisted: Boolean(shortlisted),
      rawJobData,
      notes: String(notes || ""),
    });

    return res.status(201).json({
      success: true,
      message: "Job saved successfully.",
      job: newJob,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existingJob = await Job.findOne({
        jobId: String(req.body.jobId),
        profileEmail: String(req.userEmail || req.user?.email || "")
          .trim()
          .toLowerCase(),
      });

      return res.status(200).json({
        success: false,
        message: "Job already saved.",
        job: existingJob,
      });
    }

    console.error("POST /api/jobs/save error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save job.",
      error: error.message,
    });
  }
});

router.get("/stored", protect, async (req, res) => {
  try {
    const { country = "", source = "", shortlisted, applied, skipped } = req.query;

    const query = {
      profileEmail: String(req.userEmail || req.user?.email || "")
        .trim()
        .toLowerCase(),
    };

    if (country) query.country = String(country).trim().toLowerCase();
    if (source) query.source = String(source).trim();

    if (shortlisted === "true") query.shortlisted = true;
    if (shortlisted === "false") query.shortlisted = false;

    if (applied === "true") query.applied = true;
    if (applied === "false") query.applied = false;

    if (skipped === "true") query.skipped = true;
    if (skipped === "false") query.skipped = false;

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("GET /api/jobs/stored error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stored jobs.",
      error: error.message,
    });
  }
});

router.patch("/:jobId/apply", protect, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        profileEmail: String(req.userEmail || req.user?.email || "")
          .trim()
          .toLowerCase(),
      },
      {
        $set: {
          applied: true,
          skipped: false,
          appliedAt: new Date(),
          skippedAt: null,
        },
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
    console.error("PATCH /api/jobs/:jobId/apply error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark job as applied.",
      error: error.message,
    });
  }
});

router.patch("/:jobId/skip", protect, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        profileEmail: String(req.userEmail || req.user?.email || "")
          .trim()
          .toLowerCase(),
      },
      {
        $set: {
          skipped: true,
          skippedAt: new Date(),
        },
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
    console.error("PATCH /api/jobs/:jobId/skip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to skip job.",
      error: error.message,
    });
  }
});

export default router;
