import IndiaJob from "../models/IndiaJob.js";

export const deployCheck = async (req, res) => {
  return res.json({
    success: true,
    message: "India Auto Hunt latest route file is active",
  });
};

export const getSavedIndiaJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await IndiaJob.find({
      profileEmail,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getSavedIndiaJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
};

export const getShortlistedIndiaJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await IndiaJob.find({
      profileEmail,
      shortlisted: true,
      applied: { $ne: true },
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getShortlistedIndiaJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shortlisted jobs",
      error: error.message,
    });
  }
};

export const getAppliedIndiaJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await IndiaJob.find({
      profileEmail,
      applied: true,
    }).sort({ updatedAt: -1, createdAt: -1 });

    return res.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getAppliedIndiaJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch applied jobs",
      error: error.message,
    });
  }
};

export const shortlistIndiaJobs = async (req, res) => {
  try {
    const { profileEmail, minimumScore = 60 } = req.body;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required",
      });
    }

    const jobs = await IndiaJob.find({
      profileEmail,
      applied: { $ne: true },
    });

    let shortlistedCount = 0;

    for (const job of jobs) {
      const score = Number(job.matchScore || job.score || 0);

      if (score >= Number(minimumScore) && job.shortlisted !== true) {
        job.shortlisted = true;
        await job.save();
        shortlistedCount += 1;
      }
    }

    return res.json({
      success: true,
      message: `Shortlisted ${shortlistedCount} jobs.`,
      shortlistedCount,
    });
  } catch (error) {
    console.error("shortlistIndiaJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to shortlist jobs",
      error: error.message,
    });
  }
};

export const applyAllIndiaJobs = async (req, res) => {
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
      query.shortlisted = true;
    } else if (source === "saved") {
      query.shortlisted = { $ne: true };
    } else {
      query.$or = [
        { shortlisted: true },
        { matchScore: { $gte: Number(minimumScore) } },
        { score: { $gte: Number(minimumScore) } },
      ];
    }

    const jobs = await IndiaJob.find(query);

    const appliedJobs = [];

    for (const job of jobs) {
      job.applied = true;
      job.appliedAt = new Date();
      await job.save();
      appliedJobs.push(job);
    }

    return res.json({
      success: true,
      message: `Apply all completed for ${source} jobs.`,
      totalApplied: appliedJobs.length,
      appliedJobs,
    });
  } catch (error) {
    console.error("applyAllIndiaJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply all jobs",
      error: error.message,
    });
  }
};
