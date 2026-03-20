const AutoHuntProfile = require("../models/AutoHuntProfile");
const AutoHuntJob = require("../models/AutoHuntJob");
const { runIndiaAutoHunt } = require("../services/indiaAutoHuntService");

const saveAutoHuntProfile = async (req, res) => {
  try {
    const {
      profileName,
      profileEmail,
      profilePhone,
      profileLinkedIn,
      profileGitHub,
      resumeText,
      preferredRoles,
      preferredLocations,
      minimumScore,
      remoteOnly,
    } = req.body;

    if (!profileName || !profileEmail || !resumeText) {
      return res.status(400).json({
        success: false,
        message: "profileName, profileEmail, and resumeText are required.",
      });
    }

    const profile = await AutoHuntProfile.findOneAndUpdate(
      { profileEmail: profileEmail.toLowerCase() },
      {
        profileName,
        profileEmail: profileEmail.toLowerCase(),
        profilePhone: profilePhone || "",
        profileLinkedIn: profileLinkedIn || "",
        profileGitHub: profileGitHub || "",
        resumeText,
        preferredRoles: Array.isArray(preferredRoles) ? preferredRoles : [],
        preferredLocations: Array.isArray(preferredLocations)
          ? preferredLocations
          : ["India", "Remote"],
        minimumScore: minimumScore || 60,
        remoteOnly: !!remoteOnly,
        isActive: true,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Auto hunt profile saved successfully.",
      profile,
    });
  } catch (error) {
    console.error("saveAutoHuntProfile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to save auto hunt profile.",
      error: error.message,
    });
  }
};

const runAutoHuntNow = async (req, res) => {
  try {
    const { profileEmail } = req.body;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const profile = await AutoHuntProfile.findOne({
      profileEmail: profileEmail.toLowerCase(),
      isActive: true,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Auto hunt profile not found.",
      });
    }

    const savedJobs = await runIndiaAutoHunt(profile);

    return res.status(200).json({
      success: true,
      message: "India auto hunt completed successfully.",
      totalSaved: savedJobs.length,
      jobs: savedJobs,
    });
  } catch (error) {
    console.error("runAutoHuntNow error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to run India auto hunt.",
      error: error.message,
    });
  }
};

const runAutoHuntForAllProfiles = async (req, res) => {
  try {
    const activeProfiles = await AutoHuntProfile.find({ isActive: true });

    let totalProfiles = 0;
    let totalJobsSaved = 0;

    for (const profile of activeProfiles) {
      try {
        const savedJobs = await runIndiaAutoHunt(profile);
        totalProfiles += 1;
        totalJobsSaved += savedJobs.length;
      } catch (profileError) {
        console.error(
          `Manual all-profile hunt failed for ${profile.profileEmail}:`,
          profileError.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Manual auto hunt for all active profiles completed.",
      totalProfiles,
      totalJobsSaved,
    });
  } catch (error) {
    console.error("runAutoHuntForAllProfiles error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to run auto hunt for all profiles.",
      error: error.message,
    });
  }
};

const getSavedAutoHuntJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail query is required.",
      });
    }

    const jobs = await AutoHuntJob.find({
      profileEmail: profileEmail.toLowerCase(),
      dismissed: false,
      applied: false,
    })
      .sort({ score: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getSavedAutoHuntJobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved auto hunt jobs.",
      error: error.message,
    });
  }
};

const getShortlistedJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail query is required.",
      });
    }

    const jobs = await AutoHuntJob.find({
      profileEmail: profileEmail.toLowerCase(),
      shortlisted: true,
      dismissed: false,
      applied: false,
    })
      .sort({ score: -1, updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getShortlistedJobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shortlisted jobs.",
      error: error.message,
    });
  }
};

const getAppliedJobs = async (req, res) => {
  try {
    const { profileEmail } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail query is required.",
      });
    }

    const jobs = await AutoHuntJob.find({
      profileEmail: profileEmail.toLowerCase(),
      applied: true,
    })
      .sort({ updatedAt: -1, score: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("getAppliedJobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch applied jobs.",
      error: error.message,
    });
  }
};

const markJobApplied = async (req, res) => {
  try {
    const { profileEmail, jobId } = req.body;

    if (!profileEmail || !jobId) {
      return res.status(400).json({
        success: false,
        message: "profileEmail and jobId are required.",
      });
    }

    const job = await AutoHuntJob.findOneAndUpdate(
      {
        profileEmail: profileEmail.toLowerCase(),
        jobId: String(jobId),
      },
      {
        applied: true,
        dismissed: true,
        appliedAt: new Date(),
        applicationMethod: "manual-single",
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
    console.error("markJobApplied error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to mark job as applied.",
      error: error.message,
    });
  }
};

const applyAllJobs = async (req, res) => {
  try {
    const {
      profileEmail,
      source = "saved",
      minimumScore = 0,
    } = req.body;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const filter = {
      profileEmail: profileEmail.toLowerCase(),
      applied: false,
      score: { $gte: Number(minimumScore) || 0 },
    };

    if (source === "shortlisted") {
      filter.shortlisted = true;
      filter.dismissed = false;
    } else {
      filter.dismissed = false;
    }

    const jobsToApply = await AutoHuntJob.find(filter).lean();

    if (!jobsToApply.length) {
      return res.status(200).json({
        success: true,
        message: "No jobs found to apply.",
        totalApplied: 0,
        appliedJobs: [],
      });
    }

    await AutoHuntJob.updateMany(filter, {
      $set: {
        applied: true,
        dismissed: true,
        appliedAt: new Date(),
        applicationMethod:
          source === "shortlisted" ? "manual-bulk-shortlisted" : "manual-bulk-saved",
      },
    });

    const appliedJobs = await AutoHuntJob.find({
      profileEmail: profileEmail.toLowerCase(),
      jobId: { $in: jobsToApply.map((job) => String(job.jobId)) },
    })
      .sort({ score: -1, updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: `Apply all completed for ${source} jobs.`,
      totalApplied: appliedJobs.length,
      appliedJobs,
    });
  } catch (error) {
    console.error("applyAllJobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to apply all jobs.",
      error: error.message,
    });
  }
};

const dismissJob = async (req, res) => {
  try {
    const { profileEmail, jobId } = req.body;

    if (!profileEmail || !jobId) {
      return res.status(400).json({
        success: false,
        message: "profileEmail and jobId are required.",
      });
    }

    const job = await AutoHuntJob.findOneAndUpdate(
      {
        profileEmail: profileEmail.toLowerCase(),
        jobId: String(jobId),
      },
      {
        dismissed: true,
        shortlisted: false,
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
      message: "Job dismissed successfully.",
      job,
    });
  } catch (error) {
    console.error("dismissJob error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to dismiss job.",
      error: error.message,
    });
  }
};

const shortlistJob = async (req, res) => {
  try {
    const { profileEmail, jobId } = req.body;

    if (!profileEmail || !jobId) {
      return res.status(400).json({
        success: false,
        message: "profileEmail and jobId are required.",
      });
    }

    const job = await AutoHuntJob.findOneAndUpdate(
      {
        profileEmail: profileEmail.toLowerCase(),
        jobId: String(jobId),
      },
      {
        shortlisted: true,
        dismissed: false,
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
      message: "Job shortlisted successfully.",
      job,
    });
  } catch (error) {
    console.error("shortlistJob error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to shortlist job.",
      error: error.message,
    });
  }
};

const bulkShortlistJobs = async (req, res) => {
  try {
    const { profileEmail, minimumScore = 0 } = req.body;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const result = await AutoHuntJob.updateMany(
      {
        profileEmail: profileEmail.toLowerCase(),
        dismissed: false,
        applied: false,
        score: { $gte: Number(minimumScore) || 0 },
      },
      {
        $set: {
          shortlisted: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Bulk shortlist completed successfully.",
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("bulkShortlistJobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to bulk shortlist jobs.",
      error: error.message,
    });
  }
};

module.exports = {
  saveAutoHuntProfile,
  runAutoHuntNow,
  runAutoHuntForAllProfiles,
  getSavedAutoHuntJobs,
  getShortlistedJobs,
  getAppliedJobs,
  markJobApplied,
  applyAllJobs,
  dismissJob,
  shortlistJob,
  bulkShortlistJobs,
};
