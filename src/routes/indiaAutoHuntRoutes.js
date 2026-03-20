const express = require("express");

const {
  saveAutoHuntProfile,
  runAutoHuntNow,
  runAutoHuntForAllProfiles,
  getSavedAutoHuntJobs,
  getShortlistedJobs,
  getAppliedJobs,
  markJobApplied,
  dismissJob,
  shortlistJob,
  bulkShortlistJobs,
} = require("../controllers/indiaAutoHuntController");

const router = express.Router();

router.get("/test", (req, res) => {
  return res.json({
    success: true,
    message: "India Auto Hunt route is working",
  });
});

router.get("/deploy-check", (req, res) => {
  return res.json({
    success: true,
    message: "India Auto Hunt latest route file is active",
  });
});

router.post("/profile", saveAutoHuntProfile);
router.post("/run", runAutoHuntNow);
router.post("/run-all", runAutoHuntForAllProfiles);
router.post("/bulk-shortlist", bulkShortlistJobs);

router.get("/jobs", getSavedAutoHuntJobs);
router.get("/shortlisted", getShortlistedJobs);
router.get("/applied", getAppliedJobs);

router.patch("/apply", markJobApplied);
router.patch("/dismiss", dismissJob);
router.patch("/shortlist", shortlistJob);

module.exports = router;
