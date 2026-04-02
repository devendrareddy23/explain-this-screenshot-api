import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getMyReferralStats } from "../controllers/referralController.js";

const router = express.Router();

router.get("/me", protect, getMyReferralStats);

export default router;
