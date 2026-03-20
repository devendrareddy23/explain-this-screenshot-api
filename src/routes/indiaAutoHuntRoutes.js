import express from "express";
import Job from "../models/Job.js";

const router = express.Router();

router.get("/deploy-check", async (req, res) => {
  return res.json({
    success: true,
    message: "India Auto Hunt routes working",
  });
});

router.get("/jobs", async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await Job.find({ profileEmail })
      .sort({ createdAt: -1 })
      .lean();

    const appliedJobs = jobs.filter((job) => job.applied).length;
    const shortlistedJobs = jobs.filter((job) => job.status === "shortlisted").length;
    const remainingJobs = jobs.filter((job) => !job.applied).length;

    return res.json({
      success: true,
      totalJobs: jobs.length,
      appliedJobs,
      shortlistedJobs,
      remainingJobs,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
});

router.get("/shortlisted", async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await Job.find({
      profileEmail,
      status: "shortlisted",
      applied: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      totalJobs: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching shortlisted jobs:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shortlisted jobs",
      error: error.message,
    });
  }
});

router.get("/applied", async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await Job.find({
      profileEmail,
      applied: true,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      totalJobs: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Error fetching applied jobs:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applied jobs",
      error: error.message,
    });
  }
});

router.post("/apply-all", async (req, res) => {
  try {
    const { profileEmail, source = "shortlisted", minimumScore = 60 } = req.body;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    let query = {
      profileEmail,
      applied: { $ne: true },
    };

    if (source === "shortlisted") {
      query.status = "shortlisted";
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    const appliedJobs = [];

    for (const job of jobs) {
      const scoreToUse = Number(job.matchScore || job.score || 0);

      if (scoreToUse < minimumScore) {
        continue;
      }

      job.applied = true;
      job.status = "applied";
      job.appliedAt = new Date();
      await job.save();

      appliedJobs.push(job);
    }

    return res.json({
      success: true,
      message: "Apply all completed.",
      totalApplied: appliedJobs.length,
      appliedJobs,
      debug: {
        query,
        minimumScore,
      },
    });
  } catch (error) {
    console.error("Error in apply-all:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to apply all jobs",
      error: error.message,
    });
  }
});

router.post("/job-action", async (req, res) => {
  try {
    const { jobId, profileEmail, action } = req.body;

    if (!jobId || !profileEmail || !action) {
      return res.status(400).json({
        success: false,
        message: "jobId, profileEmail, and action are required",
      });
    }

    const job = await Job.findOne({ jobId, profileEmail });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (action === "mark_applied") {
      job.applied = true;
      job.status = "applied";
      job.appliedAt = new Date();
    } else if (action === "skip") {
      job.applied = false;
      job.status = "skipped";
      job.skippedAt = new Date();
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use mark_applied or skip",
      });
    }

    await job.save();

    return res.json({
      success: true,
      message: `Job updated with action: ${action}`,
      job,
    });
  } catch (error) {
    console.error("Error in job-action:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update job action",
      error: error.message,
    });
  }
});

export const indiaAutoHuntRoutes = router;
export default router;
