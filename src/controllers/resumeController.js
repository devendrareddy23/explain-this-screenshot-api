const { buildTailoredResume } = require("../services/resumeService");

const tailorResume = async (req, res) => {
  try {
    const resumeText = req.body?.resumeText || "";
    const jobDescription = req.body?.jobDescription || "";

    if (!resumeText.trim() || !jobDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide both resume text and job description.",
      });
    }

    const result = await buildTailoredResume({
      resumeText,
      jobDescription,
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("tailorResume error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to tailor resume.",
      error: error.message,
    });
  }
};

module.exports = {
  tailorResume,
};
