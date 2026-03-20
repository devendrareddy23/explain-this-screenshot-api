import express from "express";
import {
  getIndiaAutoHuntDeployCheck,
  getIndiaAutoHuntJobs,
  getIndiaAutoHuntShortlistedJobs,
  getIndiaAutoHuntAppliedJobs,
  applyAllIndiaAutoHuntJobs
} from "../controllers/indiaAutoHuntController.js";

const indiaAutoHuntRoutes = express.Router();

indiaAutoHuntRoutes.get("/deploy-check", getIndiaAutoHuntDeployCheck);
indiaAutoHuntRoutes.get("/jobs", getIndiaAutoHuntJobs);
indiaAutoHuntRoutes.get("/shortlisted", getIndiaAutoHuntShortlistedJobs);
indiaAutoHuntRoutes.get("/applied", getIndiaAutoHuntAppliedJobs);
indiaAutoHuntRoutes.post("/apply-all", applyAllIndiaAutoHuntJobs);

export { indiaAutoHuntRoutes };
export default indiaAutoHuntRoutes;
