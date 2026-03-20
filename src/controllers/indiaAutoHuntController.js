import Job from "../models/Job.js";
import { sendJobApplicationEmail } from "../services/emailService.js";

export const getIndiaAutoHuntDeployCheck = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "India Auto Hunt deploy check working",
      build: process.env.RENDER_GIT_COMMIT || "auto-apply-email-live-v1"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Deploy check failed",
      error: error.message
    });
  }
};

export const getIndiaAutoHuntJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required"
      });
    }

    const jobs = await Job.find({ profileEmail, country: "in" })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const totalJobs = jobs.length;
    const appliedJobs = jobs.filter((job) => job.applied === true).length;
    const shortlistedJobs = jobs.filter(
      (job) => job.status === "shortlisted" && job.applied !== true
    ).length;
    const remainingJobs = jobs.filter((job) => job.applied !== true).length;

    return res.json({
      success: true,
      totalJobs,
      appliedJobs,
      shortlistedJobs,
      remainingJobs,
      jobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch India Auto Hunt jobs",
      error: error.message
    });
  }
};

export const getIndiaAutoHuntShortlistedJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required"
      });
    }

    const jobs = await Job.find({
      profileEmail,
      country: "in",
      status: "shortlisted",
      applied: { $ne: true }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      totalJobs: jobs.length,
      jobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shortlisted jobs",
      error: error.message
    });
  }
};

export const getIndiaAutoHuntAppliedJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required"
      });
    }

    const jobs = await Job.find({
      profileEmail,
      country: "in",
      applied: true
    })
      .sort({ appliedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      totalJobs: jobs.length,
      jobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applied jobs",
      error: error.message
    });
  }
};

export const applyAllIndiaAutoHuntJobs = async (req, res) => {
  try {
    const {
      profileEmail,
      source = "shortlisted",
      minimumScore = 60
    } = req.body;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required"
      });
    }

    let query = {
      profileEmail,
      country: "in",
      applied: { $ne: true }
    };

    if (source === "shortlisted") {
      query.status = "shortlisted";
    }

    const jobs = await Job.find(query).sort({ matchScore: -1, updatedAt: -1 });

    const eligibleJobs = jobs.filter(
      (job) => Number(job.matchScore || 0) >= Number(minimumScore)
    );

    const appliedJobs = [];

    for (const job of eligibleJobs) {
      try {
        await sendJobApplicationEmail({
          to: profileEmail,
          subject: `Auto Apply Ready: ${job.title} at ${job.company}`,
          text: [
            `Company: ${job.company}`,
            `Role: ${job.title}`,
            `Location: ${job.location}`,
            `Match Score: ${job.matchScore}`,
            `Job URL: ${job.jobUrl || job.redirectUrl || "N/A"}`,
            "",
            "This was selected by India Auto Hunt auto-apply."
          ].join("\n")
        });

        job.applied = true;
        job.appliedAt = new Date();
        job.emailSentAt = new Date();
        job.status = "applied";

        await job.save();

        appliedJobs.push(job);
      } catch (emailError) {
        console.error(`Failed applying for job ${job._id}:`, emailError.message);
      }
    }

    return res.json({
      success: true,
      message: `Apply all completed for ${source} jobs.`,
      totalEligible: eligibleJobs.length,
      totalApplied: appliedJobs.length,
      appliedJobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to apply all India Auto Hunt jobs",
      error: error.message
    });
  }
};
