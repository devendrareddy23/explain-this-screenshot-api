const fs = require("fs");
const { explainScreenshot } = require("../services/explainService");

const analyzeScreenshot = async (req, res) => {
  try {
    let imageBase64 = "";
    let mimeType = "";
    const errorText = req.body.errorText || "";

    if (req.file) {
      imageBase64 = fs.readFileSync(req.file.path, { encoding: "base64" });
      mimeType = req.file.mimetype;
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

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

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
