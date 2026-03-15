const { generateExplanation } = require("../services/explainService");

exports.explainImage = async (req, res) => {
  const { imageUrl } = req.body;

  const result = await generateExplanation(imageUrl);

  return res.status(200).json({
    success: true,
    message: "Image explanation generated",
    data: {
      imageUrl,
      explanation: result.explanation,
    },
  });
};
