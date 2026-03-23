import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "plan usageDate resumeCount coverLetterCount"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const today = new Date().toDateString();

    let resumeUsed = user.resumeCount || 0;
    let coverLetterUsed = user.coverLetterCount || 0;

    if (user.usageDate !== today) {
      resumeUsed = 0;
      coverLetterUsed = 0;
    }

    return res.status(200).json({
      success: true,
      plan: user.plan || "free",
      limits: {
        resume: user.plan === "pro" || user.plan === "auto" ? "unlimited" : 3,
        coverLetter:
          user.plan === "pro" || user.plan === "auto" ? "unlimited" : 2,
      },
      used: {
        resume: resumeUsed,
        coverLetter: coverLetterUsed,
      },
      remaining: {
        resume:
          user.plan === "pro" || user.plan === "auto"
            ? "unlimited"
            : Math.max(0, 3 - resumeUsed),
        coverLetter:
          user.plan === "pro" || user.plan === "auto"
            ? "unlimited"
            : Math.max(0, 2 - coverLetterUsed),
      },
    });
  } catch (error) {
    console.error("Usage route error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch usage.",
    });
  }
});

export default router;
