const express = require("express");

const router = express.Router();

/**
 * Health/test route for jobs
 */
router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "jobsRoutes is working",
  });
});

/**
 * Temporary search route
 */
router.post("/search", async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Temporary jobs search route is live",
      jobs: [],
    });
  } catch (error) {
    console.error("Jobs search error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to search jobs",
      error: error.message,
    });
  }
});

module.exports = router;
