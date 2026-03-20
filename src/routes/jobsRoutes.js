const express = require("express");

const router = express.Router();

router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "jobsRoutes is working",
  });
});

router.post("/search", async (req, res) => {
  return res.json({
    success: true,
    message: "Temporary jobs search route is live",
    jobs: [],
  });
});

module.exports = router;
