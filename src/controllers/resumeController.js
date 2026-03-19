const { generateTailoredResume } = require("../services/resumeService");

const tailorResume = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "Resume text and job description are required.",
      });
    }

    const result = await generateTailoredResume({
      resumeText,
      jobDescription,
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Resume tailor error:", error.message);

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
