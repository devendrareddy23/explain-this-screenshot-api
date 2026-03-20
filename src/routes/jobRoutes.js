import express from "express";
import {
  searchJobs,
  saveSearchProfile,
  getStoredJobs,
  updateJobStatus,
} from "../controllers/jobController.js";

const router = express.Router();

router.post("/search", searchJobs);
router.post("/profile", saveSearchProfile);
router.get("/stored", getStoredJobs);
router.patch("/:jobId", updateJobStatus);

export default router;
