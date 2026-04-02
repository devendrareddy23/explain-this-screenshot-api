import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  deleteResumeVault,
  getResumeVault,
  saveResumeVault,
} from "../controllers/resumeVaultController.js";

const router = express.Router();

router.get("/me", protect, getResumeVault);
router.put("/me", protect, saveResumeVault);
router.delete("/me", protect, deleteResumeVault);

export default router;
