import { tailorResume } from "../services/resumeService.js";

export const resumeTailor = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "Failed to tailor resume.",
        error: "Missing resume or job description",
      });
    }

    const tailoredResume = await tailorResume(resumeText, jobDescription);

    return res.json({
      success: true,
      message: "Resume tailored successfully.",
      tailoredResume,
      result: tailoredResume,
    });
  } catch (error) {
    console.error("RESUME TAILOR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to tailor resume.",
      error: error.message,
    });
  }
};
