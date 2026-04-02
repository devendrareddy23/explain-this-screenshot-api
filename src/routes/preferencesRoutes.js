import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getMyPreferences,
  saveMyPreferences,
  saveCareerDnaInterview,
} from "../controllers/preferencesController.js";
import { getMyConnections, saveMyConnections } from "../controllers/referralAssistController.js";

const router = express.Router();

router.get("/me", protect, getMyPreferences);
router.put("/me", protect, saveMyPreferences);
router.post("/career-dna", protect, saveCareerDnaInterview);
router.get("/connections", protect, getMyConnections);
router.put("/connections", protect, saveMyConnections);

export default router;
