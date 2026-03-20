const express = require("express");

const router = express.Router();

router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "India Auto Hunt route is working",
  });
});

router.get("/jobs", async (req, res) => {
  try {
    const { profileEmail } = req.query;

    return res.json({
      success: true,
      message: "India Auto Hunt jobs route is live",
      profileEmail: profileEmail || null,
      jobs: [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load India Auto Hunt jobs",
      error: error.message,
    });
  }
});

module.exports = router;
