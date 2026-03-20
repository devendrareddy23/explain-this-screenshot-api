import express from "express";
import Job from "../models/Job.js";

const router = express.Router();

router.get("/deploy-check", (req, res) => {
  return res.json({
    success: true,
    route: "indiaAutoHuntRoutes",
    message: "indiaAutoHuntRoutes is loaded",
  });
});

router.get("/jobs", async (req, res) => {
  try {
    const { profileEmail = "" } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const jobs = await Job.find({ profileEmail }).sort({
      score: -1,
      createdAt: -1,
    });

    const appliedJobs = jobs.filter((job) => job.applied === true);
    const shortlistedJobs = jobs.filter((job) => job.score >= 70);
    const remainingJobs = jobs.filter((job) => job.applied !== true);

    return res.json({
      success: true,
      totalJobs: jobs.length,
      appliedJobs: appliedJobs.length,
      shortlistedJobs: shortlistedJobs.length,
      remainingJobs: remainingJobs.length,
      jobs,
    });
  } catch (error) {
    console.error("GET /api/india-auto-hunt/jobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch India Auto Hunt jobs.",
      error: error.message,
    });
  }
});

router.post("/apply-all", async (req, res) => {
  try {
    const {
      profileEmail = "",
      minimumScore = 70,
    } = req.body || {};

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const query = {
      profileEmail,
      applied: false,
      score: { $gte: Number(minimumScore || 70) },
    };

    const jobsToApply = await Job.find(query).sort({
      score: -1,
      createdAt: -1,
    });

    const appliedJobs = [];

    for (const job of jobsToApply) {
      job.applied = true;
      job.appliedAt = new Date();
      await job.save();
      appliedJobs.push(job);
    }

    return res.json({
      success: true,
      message: "Apply all completed.",
      totalApplied: appliedJobs.length,
      appliedJobs,
    });
  } catch (error) {
    console.error("POST /api/india-auto-hunt/apply-all error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to apply all jobs.",
      error: error.message,
    });
  }
});

export { router as indiaAutoHuntRoutes };
export default router;
