import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getOutreachForUser, markOutreachOpened, markOutreachReplied } from "../controllers/outreachController.js";

const router = express.Router();

router.get("/me", protect, getOutreachForUser);
router.patch("/:id/replied", protect, markOutreachReplied);
router.get("/open/:id.gif", markOutreachOpened);

export default router;
