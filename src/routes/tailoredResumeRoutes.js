import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { TailoredResume } from "../models/TailoredResume.js";

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    const {
      originalResumeText,
      jobDescription,
      tailoredResumeText,
      title,
    } = req.body;

    if (!originalResumeText || !jobDescription || !tailoredResumeText) {
      return res.status(400).json({
        success: false,
        message:
          "originalResumeText, jobDescription, and tailoredResumeText are required.",
      });
    }

    const savedResume = await TailoredResume.create({
      userId: req.user._id,
      originalResumeText,
      jobDescription,
      tailoredResumeText,
      title: title || "Tailored Resume",
    });

    return res.status(201).json({
      success: true,
      message: "Tailored resume saved successfully.",
      tailoredResume: savedResume,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save tailored resume.",
      error: error.message,
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const resumes = await TailoredResume.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      tailoredResumes: resumes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tailored resumes.",
      error: error.message,
    });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const resume = await TailoredResume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Tailored resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      tailoredResume: resume,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tailored resume.",
      error: error.message,
    });
  }
});

export default router;
