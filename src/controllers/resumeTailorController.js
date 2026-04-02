import { tailorResume } from "../services/resumeService.js";

export const resumeTailor = async (req, res) => {
  try {
    console.log("Resume tailor called");
    console.log("Body:", req.body);

    const { resumeText, resume, jobDescription } = req.body || {};
    const normalizedResumeText = String(resumeText || resume || "").trim();
    const normalizedJobDescription = String(jobDescription || "").trim();

    if (!normalizedResumeText || !normalizedJobDescription) {
      return res.status(400).json({
        success: false,
        message: "Failed to tailor resume.",
        error: "Missing resume or job description",
      });
    }

    const result = await tailorResume(normalizedResumeText, normalizedJobDescription);

    console.log("AI response:", result);

    return res.json({
      success: true,
      message: "Resume tailored successfully.",
      tailoredResume: result.tailoredResume,
      matchScore: result.matchScore,
      keywordsAdded: result.keywordsAdded,
      improvements: result.improvementSummary,
      improvementSummary: result.improvementSummary,
      result,
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
