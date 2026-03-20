const { generateExplanation } = require("../services/explainService");

const explainScreenshot = async (req, res) => {
  try {
    const file = req.file;
    const errorText = req.body?.errorText || "";

    let imageBase64 = null;
    let mimeType = "image/png";

    if (file && file.buffer) {
      imageBase64 = file.buffer.toString("base64");
      mimeType = file.mimetype || "image/png";
    }

    if (!imageBase64 && !errorText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please upload a screenshot or paste an error message."
      });
    }

    const result = await generateExplanation({
      imageBase64,
      mimeType,
      errorText,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
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
