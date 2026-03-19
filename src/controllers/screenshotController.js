const { generateExplanation } = require("../services/explainService");

const explainScreenshot = async (req, res) => {
  try {
    const { errorText } = req.body || {};

    if (!errorText || !errorText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Error text is required.",
      });
    }

    const explanation = await generateExplanation({ errorText });

    return res.status(200).json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error("Screenshot explain error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to analyze screenshot.",
      error: error.message,
    });
  }
};

module.exports = {
  explainScreenshot,
};
