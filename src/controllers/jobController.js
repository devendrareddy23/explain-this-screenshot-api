const { searchAndScoreJobs } = require("../services/jobSearchService");

const searchJobs = async (req, res) => {
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

    const result = await searchAndScoreJobs({
      search: String(search).trim(),
      limit: Number(limit) || 10,
      profileName: profileName || "",
      profileEmail: profileEmail || "",
      profilePhone: profilePhone || "",
      profileLinkedIn: profileLinkedIn || "",
      profileGitHub: profileGitHub || "",
      resumeText: String(resumeText),
      preferredRoles: preferredRoles || "",
      preferredLocations: preferredLocations || "",
      minimumScore: Number(minimumScore) || 0,
      remoteOnly: Boolean(remoteOnly),
      globalSearch: Boolean(globalSearch),
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

module.exports = {
  searchJobs,
};
