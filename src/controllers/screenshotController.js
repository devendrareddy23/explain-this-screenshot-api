const fs = require("fs");
const fileToBase64 = require("../utils/fileToBase64");
const { analyzeImage } = require("../services/aiService");

exports.analyzeScreenshot = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: "Screenshot file is required",
    });
  }

  const base64Image = fileToBase64(file.path);

  const aiResult = await analyzeImage(base64Image, file.mimetype);

  fs.unlink(file.path, (err) => {
    if (err) {
      console.error("File delete error:", err.message);
    }
  });

  return res.status(200).json({
    success: true,
    message: "Screenshot analyzed successfully",
    data: {
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      explanation: aiResult.explanation,
    },
  });
};
