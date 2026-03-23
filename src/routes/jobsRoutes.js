import express from "express";
import Job from "../models/Job.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

router.post("/search", protect, async (req, res) => {
  try {
    const {
      search = "",
      limit = 20,
      country = "",
      source = "",
      remoteOnly = false,
      minimumScore = 0,
    } = req.body;

    const query = {
      profileEmail: (req.userEmail || "").toLowerCase(),
    };

    if (country) {
      query.country = country;
    }

    if (source) {
      query.source = source;
    }

    if (remoteOnly) {
      query.remote = true;
    }

    if (minimumScore) {
      query.score = { $gte: Number(minimumScore) || 0 };
    }

    if (search && String(search).trim()) {
      const safeSearch = String(search).trim();
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { company: { $regex: safeSearch, $options: "i" } },
        { location: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 20);

    return res.status(200).json({
      success: true,
      total: jobs.length,
      jobs,
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

router.get("/stored", protect, async (req, res) => {
  try {
    const { country = "", source = "", shortlisted, applied, skipped } = req.query;

    const query = {
      profileEmail: (req.userEmail || "").toLowerCase(),
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
        profileEmail: (req.userEmail || "").toLowerCase(),
      },
      {
        $set: {
          applied: true,
          skipped: false,
          appliedAt: new Date(),
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
        profileEmail: (req.userEmail || "").toLowerCase(),
      },
      {
        $set: {
          skipped: true,
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
      message: "Job skipped.",
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

export { router as jobsRoutes };
export default router;
