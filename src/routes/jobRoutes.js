import express from "express";
import {
  searchJobs,
  getStoredJobs
} from "../controllers/jobController.js";

const jobRoutes = express.Router();

jobRoutes.post("/search", searchJobs);
jobRoutes.get("/stored", getStoredJobs);

export { jobRoutes };
export default jobRoutes;
