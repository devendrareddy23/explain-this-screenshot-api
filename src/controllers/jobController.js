import Job from "../models/Job.js";

export const searchJobs = async (req, res) => {
  try {
    const { profileEmail } = req.body;

    const jobs = await Job.find(profileEmail ? { profileEmail } : {})
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      message: "Temporary searchJobs controller working",
      totals: {
        totalJobs: jobs.length
      },
      jobs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search jobs",
      error: error.message
    });
  }
};

export const getStoredJobs = async (req, res) => {
  try {
    const { profileEmail, country } = req.query;

    const query = {};
    if (profileEmail) query.profileEmail = profileEmail;
    if (country) query.country = country;

    const jobs = await Job.find(query)
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
      message: "Failed to fetch stored jobs",
      error: error.message
    });
  }
};
