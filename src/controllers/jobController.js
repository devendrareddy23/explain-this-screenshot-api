const asyncHandler = require("../utils/asyncHandler");
const { searchRealJobs } = require("../services/jobService");

const searchJobsController = asyncHandler(async (req, res) => {
  const {
    search,
    limit,
    category,
    preferredRoles,
    preferredLocations,
    minimumScore,
  } = req.body;

  const result = await searchRealJobs({
    search,
    limit,
    category,
    preferredRoles,
    preferredLocations,
    minimumScore,
  });

  res.status(200).json({
    success: true,
    result,
  });
});

module.exports = {
  searchJobsController,
};
