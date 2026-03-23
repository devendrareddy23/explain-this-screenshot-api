import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { generateResume } from "../controllers/resumeTailorController.js";

const router = express.Router();

router.post("/", protect, generateResume);

export default router;
