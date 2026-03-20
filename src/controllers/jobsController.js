const jobService = require("../services/jobService");

function safeRequire(path) {
  try {
    return require(path);
  } catch (error) {
    return null;
  }
}

const Job = safeRequire("../models/Job");
const MatchedJob = safeRequire("../models/MatchedJob");
const AutoHuntJob = safeRequire("../models/AutoHuntJob");
const AutoHuntProfile = safeRequire("../models/AutoHuntProfile");
const SearchProfile = safeRequire("../models/SearchProfile");

async function searchJobs(req, res) {
  try {
    if (typeof jobService.searchRealJobs !== "function") {
      return res.status(500).json({
        success: false,
        message: "searchRealJobs function not found in jobService.js",
        availableExports: Object.keys(jobService || {}),
      });
    }

    const result = await jobService.searchRealJobs(req.body || {});
    return res.json({
      success: true,
      source: "legacy-global-search",
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search jobs.",
      error: error.message,
    });
  }
}

async function getStoredJobs(req, res) {
  try {
    const { profileEmail, country, limit } = req.query || {};
    const parsedLimit = Number(limit) || 50;

    const filters = {};
    if (profileEmail) filters.profileEmail = profileEmail;
    if (country) filters.country = country;

    if (AutoHuntJob && typeof AutoHuntJob.find === "function") {
      const autoHuntJobs = await AutoHuntJob.find(filters)
        .sort({ createdAt: -1 })
        .limit(parsedLimit);

      if (autoHuntJobs.length > 0) {
        return res.json({
          success: true,
          source: "AutoHuntJob",
          totalJobs: autoHuntJobs.length,
          jobs: autoHuntJobs,
        });
      }
    }

    if (Job && typeof Job.find === "function") {
      const legacyJobs = await Job.find(profileEmail ? { profileEmail } : {})
        .sort({ createdAt: -1 })
        .limit(parsedLimit);

      return res.json({
        success: true,
        source: "Job",
        totalJobs: legacyJobs.length,
        jobs: legacyJobs,
      });
    }

    if (MatchedJob && typeof MatchedJob.find === "function") {
      const matchedJobs = await MatchedJob.find({})
        .sort({ createdAt: -1 })
        .limit(parsedLimit);

      return res.json({
        success: true,
        source: "MatchedJob",
        totalJobs: matchedJobs.length,
        jobs: matchedJobs,
      });
    }

    return res.status(500).json({
      success: false,
      message: "No usable job model found for stored jobs.",
      checkedModels: ["AutoHuntJob", "Job", "MatchedJob"],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get stored jobs.",
      error: error.message,
    });
  }
}

async function getJobsProfile(req, res) {
  try {
    const { profileEmail } = req.query || {};

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    if (AutoHuntProfile && typeof AutoHuntProfile.findOne === "function") {
      const autoProfile = await AutoHuntProfile.findOne({ profileEmail });

      if (autoProfile) {
        return res.json({
          success: true,
          source: "AutoHuntProfile",
          profile: autoProfile,
        });
      }
    }

    if (SearchProfile && typeof SearchProfile.findOne === "function") {
      const legacyProfile = await SearchProfile.findOne({ profileEmail });

      return res.json({
        success: true,
        source: "SearchProfile",
        profile: legacyProfile || null,
      });
    }

    return res.status(500).json({
      success: false,
      message: "No usable profile model found.",
      checkedModels: ["AutoHuntProfile", "SearchProfile"],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get jobs profile.",
      error: error.message,
    });
  }
}

module.exports = {
  searchJobs,
  getStoredJobs,
  getJobsProfile,
};
