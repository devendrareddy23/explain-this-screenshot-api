import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { generateCoverLetter } from "../controllers/coverLetterController.js";

const router = express.Router();

router.post("/", protect, generateCoverLetter);

export default router;
