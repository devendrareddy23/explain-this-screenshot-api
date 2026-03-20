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

module.exports = {
  saveAutoHuntProfile,
  runAutoHuntNow,
  runAutoHuntForAllProfiles,
  getSavedAutoHuntJobs,
  markJobApplied,
  dismissJob,
  shortlistJob,
  getShortlistedJobs,
};
