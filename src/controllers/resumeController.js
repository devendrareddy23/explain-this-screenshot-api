import { generateTailoredResume } from "../services/resumeService.js";

export const tailorResume = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    const safeResumeText = (resumeText || "").trim();
    const safeJobDescription = (jobDescription || "").trim();

    if (!safeResumeText || !safeJobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeText and jobDescription are required.",
      });
    }

    const result = await generateTailoredResume({
      resumeText: safeResumeText,
      jobDescription: safeJobDescription,
    });

    return res.status(200).json({
      success: true,
      message: "Resume tailored successfully.",
      result,
      tailoredResume: result,
    });
  } catch (error) {
    console.error("Resume tailor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to tailor resume.",
      error: error.message,
    });
  }
};
