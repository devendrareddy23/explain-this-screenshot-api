const express = require("express");
const {
  saveAutoHuntProfile,
  runAutoHuntNow,
  runAutoHuntForAllProfiles,
  getSavedAutoHuntJobs,
  markJobApplied,
  dismissJob,
  shortlistJob,
  getShortlistedJobs,
} = require("../controllers/indiaAutoHuntController");

const router = express.Router();

router.post("/profile", saveAutoHuntProfile);
router.post("/run", runAutoHuntNow);
router.post("/run-all", runAutoHuntForAllProfiles);

router.get("/jobs", getSavedAutoHuntJobs);
router.get("/shortlisted", getShortlistedJobs);

router.patch("/apply", markJobApplied);
router.patch("/dismiss", dismissJob);
router.patch("/shortlist", shortlistJob);

module.exports = router;
