import express from "express";
import {
  getIndiaAutoHuntDeployCheck,
  getIndiaAutoHuntJobs,
  getIndiaAutoHuntShortlistedJobs,
  getIndiaAutoHuntAppliedJobs,
  applyAllIndiaAutoHuntJobs
} from "../controllers/indiaAutoHuntController.js";

const router = express.Router();

router.get("/deploy-check", getIndiaAutoHuntDeployCheck);
router.get("/jobs", getIndiaAutoHuntJobs);
router.get("/shortlisted", getIndiaAutoHuntShortlistedJobs);
router.get("/applied", getIndiaAutoHuntAppliedJobs);
router.post("/apply-all", applyAllIndiaAutoHuntJobs);

export default router;
