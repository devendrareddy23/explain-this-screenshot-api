const { explainScreenshot } = require("../services/explainService");

const analyzeScreenshot = async (req, res) => {
  try {
    let imageBase64 = "";
    let mimeType = "";
    const errorText = req.body?.errorText || "";

    if (req.file?.buffer) {
      imageBase64 = req.file.buffer.toString("base64");
      mimeType = req.file.mimetype || "image/png";
    }

    if (!imageBase64 && !errorText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please upload a screenshot or paste error text.",
      });
    }

    const result = await explainScreenshot({
      imageBase64,
      mimeType,
      errorText,
    });

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("analyzeScreenshot error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to analyze screenshot.",
      error: error.message,
    });
  }
};

module.exports = {
  analyzeScreenshot,
};
