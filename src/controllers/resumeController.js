const { generateTailoredResume } = require("../services/resumeService");

const tailorResume = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeText and jobDescription are required."
      });
    }

    const result = await generateTailoredResume({
      resumeText,
      jobDescription,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
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
