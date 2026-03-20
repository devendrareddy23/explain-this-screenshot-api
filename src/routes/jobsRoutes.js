const express = require("express");
const {
  searchJobs,
  getStoredJobs,
  getJobsProfile,
} = require("../controllers/jobsController");

const router = express.Router();

router.post("/search", searchJobs);
router.get("/stored", getStoredJobs);
router.get("/profile", getJobsProfile);

module.exports = router;
