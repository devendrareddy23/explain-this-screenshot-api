const express = require("express");
const {
  saveSearchProfile,
  searchJobs,
  getStoredJobs,
  updateJobStatus,
} = require("../controllers/jobController");

const router = express.Router();

router.post("/profile", saveSearchProfile);
router.post("/search", searchJobs);
router.get("/", getStoredJobs);
router.patch("/:jobId", updateJobStatus);

module.exports = router;
