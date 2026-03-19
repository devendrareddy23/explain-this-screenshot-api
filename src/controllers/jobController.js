const asyncHandler = require("../utils/asyncHandler");
const { searchRealJobs } = require("../services/jobService");

const searchJobsController = asyncHandler(async (req, res) => {
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
    isSearchActive,
  } = req.body;

  const result = await searchRealJobs({
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
    isSearchActive,
  });

  res.status(200).json({
    success: true,
    result,
  });
});

module.exports = {
  searchJobsController,
};
