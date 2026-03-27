import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { autoApply } from "../controllers/autoApplyController.js";

const router = express.Router();

router.post("/me", protect, autoApply);

export default router;
