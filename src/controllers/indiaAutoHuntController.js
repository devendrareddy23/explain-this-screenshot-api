import Job from "../models/Job.js";
import { sendJobApplicationEmail } from "../services/emailService.js";

export const getIndiaAutoHuntDeployCheck = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "India Auto Hunt deploy check working",
      build: process.env.RENDER_GIT_COMMIT || "auto-apply-email-live-v3"
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
      .sort({ matchScore: -1, updatedAt: -1, createdAt: -1 })
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
    } = req.body || {};

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required"
      });
    }

    const query = {
      profileEmail,
      country: "in",
      applied: { $ne: true }
    };

    if (source === "shortlisted") {
      query.status = "shortlisted";
    }

    const rawJobs = await Job.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const normalizedJobs = rawJobs.map((job) => {
      const effectiveScore = Number(
        job.matchScore ?? job.score ?? 0
      );

      return {
        ...job,
        effectiveScore
      };
    });

    const eligibleJobs = normalizedJobs.filter(
      (job) => job.effectiveScore >= Number(minimumScore)
    );

    const appliedJobs = [];
    const failedJobs = [];

    for (const job of eligibleJobs) {
      try {
        await sendJobApplicationEmail({
          to: profileEmail,
          subject: `Auto Apply Ready: ${job.title} at ${job.company}`,
          text: [
            `Company: ${job.company}`,
            `Role: ${job.title}`,
            `Location: ${job.location || "N/A"}`,
            `Match Score: ${job.effectiveScore}`,
            `Job URL: ${job.jobUrl || job.redirectUrl || "N/A"}`,
            "",
            "This was selected by India Auto Hunt auto-apply."
          ].join("\n")
        });

        await Job.updateOne(
          { _id: job._id },
          {
            $set: {
              applied: true,
              appliedAt: new Date(),
              emailSentAt: new Date(),
              status: "applied"
            }
          }
        );

        appliedJobs.push(job);
      } catch (emailError) {
        failedJobs.push({
          _id: job._id,
          title: job.title,
          company: job.company,
          error: emailError.message
        });
      }
    }

    return res.json({
      success: true,
      message: "Apply all completed.",
      debug: {
        query,
        minimumScore: Number(minimumScore),
        rawJobsCount: rawJobs.length,
        rawJobsPreview: normalizedJobs.map((job) => ({
          _id: job._id,
          title: job.title,
          status: job.status,
          applied: job.applied,
          matchScore: job.matchScore ?? null,
          score: job.score ?? null,
          effectiveScore: job.effectiveScore
        }))
      },
      totalEligible: eligibleJobs.length,
      totalApplied: appliedJobs.length,
      totalFailed: failedJobs.length,
      appliedJobs,
      failedJobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to apply all jobs",
      error: error.message
    });
  }
};
