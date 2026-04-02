import express from "express";
import protect from "../middleware/protect.js";
import { getMyPipelineSummary, getMyStats } from "../controllers/statsController.js";

const router = express.Router();

router.get("/me", protect, getMyStats);
router.get("/pipeline-summary", protect, getMyPipelineSummary);

export default router;
