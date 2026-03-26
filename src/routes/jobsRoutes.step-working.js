import express from "express";
import Job from "../models/Job.js";
import { protect } from "../middleware/authMiddleware.js";
import { searchScoreAndStoreJobs } from "../services/jobSearchService.js";

const router = express.Router();

router.post("/search", protect, async (req, res) => {
  console.log("🔥 /api/jobs/search body:", req.body);

  try {
    const {
      search = "",
      location = "",
      jobType = "",
      limit = 20,
      minimumScore = 0,
      country = "",
      source = "",
      remoteOnly = false
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
        message: "search (role/field) is required."
      });
    }

    const result = await searchScoreAndStoreJobs({
      search: safeSearch,
      limit: Number(limit) || 20,
      minimumScore: Number(minimumScore) || 0,
      remoteOnly: finalRemoteOnly,
      country: safeCountry || "in",
      source: safeSource,
      profileEmail: (req.userEmail || "").toLowerCase(),
      jobType: safeJobType,
      location: safeLocation
    });

    return res.status(200).json({
      success: true,
      totalFetched: result.totalFetched,
      totalMatched: result.totalMatched,
      jobs: result.jobs,
      shortlistedJobs: result.shortlistedJobs,
      warning: result.warning
    });
  } catch (error) {
    console.error("POST /api/jobs/search error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search jobs.",
      error: error.message
    });
  }
});

router.get("/stored", protect, async (req, res) => {
  try {
    const { country = "", source = "", shortlisted, applied, skipped } = req.query;

    const query = {
      profileEmail: (req.userEmail || "").toLowerCase()
    };

    if (country) query.country = country;
    if (source) query.source = source;

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
      jobs
    });
  } catch (error) {
    console.error("GET /api/jobs/stored error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stored jobs.",
      error: error.message
    });
  }
});

router.patch("/:jobId/apply", protect, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        profileEmail: (req.userEmail || "").toLowerCase()
      },
      {
        $set: {
          applied: true,
          skipped: false,
          appliedAt: new Date()
        }
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job marked as applied.",
      job
    });
  } catch (error) {
    console.error("PATCH /api/jobs/:jobId/apply error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark job as applied.",
      error: error.message
    });
  }
});

router.patch("/:jobId/skip", protect, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOneAndUpdate(
      {
        _id: jobId,
        profileEmail: (req.userEmail || "").toLowerCase()
      },
      {
        $set: {
          skipped: true
        }
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job skipped.",
      job
    });
  } catch (error) {
    console.error("PATCH /api/jobs/:jobId/skip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to skip job.",
      error: error.message
    });
  }
});

export { router as jobsRoutes };
export default router;
