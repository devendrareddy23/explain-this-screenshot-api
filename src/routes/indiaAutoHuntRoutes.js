import express from "express";
import {
  deployCheck,
  getSavedIndiaJobs,
  getShortlistedIndiaJobs,
  getAppliedIndiaJobs,
  shortlistIndiaJobs,
  applyAllIndiaJobs,
} from "../controllers/indiaAutoHuntController.js";

const router = express.Router();

router.get("/deploy-check", deployCheck);
router.get("/jobs", getSavedIndiaJobs);
router.get("/shortlisted", getShortlistedIndiaJobs);
router.get("/applied", getAppliedIndiaJobs);

router.post("/shortlist", shortlistIndiaJobs);
router.post("/apply-all", applyAllIndiaJobs);

export default router;
