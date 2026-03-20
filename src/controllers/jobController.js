import SearchProfile from "../models/SearchProfile.js";
import Job from "../models/Job.js";
import {
  searchScoreAndStoreJobs,
  listStoredJobs,
} from "../services/jobSearchService.js";

export const saveSearchProfile = async (req, res) => {
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
      country,
      autoHuntEnabled,
      lastSearchQuery,
    } = req.body;

    if (!profileEmail || !String(profileEmail).trim()) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const normalizedEmail = String(profileEmail).trim().toLowerCase();

    const profile = await SearchProfile.findOneAndUpdate(
      { profileEmail: normalizedEmail },
      {
        profileName: profileName || "",
        profileEmail: normalizedEmail,
        profilePhone: profilePhone || "",
        profileLinkedIn: profileLinkedIn || "",
        profileGitHub: profileGitHub || "",
        resumeText: resumeText || "",
        preferredRoles: preferredRoles || "",
        preferredLocations: preferredLocations || "",
        minimumScore: Number(minimumScore) || 50,
        country: (country || "in").toLowerCase(),
        autoHuntEnabled: Boolean(autoHuntEnabled),
        lastSearchQuery: lastSearchQuery || "",
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Search profile saved successfully.",
      profile,
    });
  } catch (error) {
    console.error("Save search profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save search profile.",
    });
  }
};

export const searchJobs = async (req, res) => {
  try {
    const {
      search,
      limit,
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
      globalSearch,
      country,
      autoHuntEnabled,
    } = req.body;

    if (!resumeText || !String(resumeText).trim()) {
      return res.status(400).json({
        success: false,
        message: "resumeText is required.",
      });
    }

    if (!search || !String(search).trim()) {
      return res.status(400).json({
        success: false,
        message: "search is required.",
      });
    }

    if (profileEmail && String(profileEmail).trim()) {
      const normalizedEmail = String(profileEmail).trim().toLowerCase();

      await SearchProfile.findOneAndUpdate(
        { profileEmail: normalizedEmail },
        {
          profileName: profileName || "",
          profileEmail: normalizedEmail,
          profilePhone: profilePhone || "",
          profileLinkedIn: profileLinkedIn || "",
          profileGitHub: profileGitHub || "",
          resumeText: String(resumeText),
          preferredRoles: preferredRoles || "",
          preferredLocations: preferredLocations || "",
          minimumScore: Number(minimumScore) || 50,
          country: (country || "in").toLowerCase(),
          autoHuntEnabled: Boolean(autoHuntEnabled),
          lastSearchQuery: String(search).trim(),
        },
        { new: true, upsert: true }
      );
    }

    const result = await searchScoreAndStoreJobs({
      search: String(search).trim(),
      limit: Number(limit) || 10,
      resumeText: String(resumeText),
      preferredRoles: preferredRoles || "",
      preferredLocations: preferredLocations || "",
      minimumScore: Number(minimumScore) || 0,
      remoteOnly: Boolean(remoteOnly),
      globalSearch: Boolean(globalSearch),
      country: (country || "in").toLowerCase(),
      profileEmail: profileEmail ? String(profileEmail).trim().toLowerCase() : "",
    });

    return res.status(200).json({
      success: true,
      message: "Jobs fetched successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Job search error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search jobs.",
    });
  }
};

export const getStoredJobs = async (req, res) => {
  try {
    const { country, status, minimumScore, limit } = req.query;

    const jobs = await listStoredJobs({
      country,
      status,
      minimumScore,
      limit,
    });

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Get stored jobs error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stored jobs.",
    });
  }
};

export const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, tailoredResume, coverNote } = req.body;

    const allowedStatuses = ["new", "shortlisted", "tailored", "applied", "skipped"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value.",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    if (status) job.status = status;
    if (typeof tailoredResume === "string") job.tailoredResume = tailoredResume;
    if (typeof coverNote === "string") job.coverNote = coverNote;

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job updated successfully.",
      job,
    });
  } catch (error) {
    console.error("Update job status error:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update job.",
    });
  }
};
