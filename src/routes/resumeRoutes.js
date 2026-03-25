import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { tailorResume } from "../controllers/resumeController.js";

const router = express.Router();

router.post("/", protect, tailorResume);

export default router;
