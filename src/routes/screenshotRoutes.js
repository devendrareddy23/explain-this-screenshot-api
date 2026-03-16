const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Screenshot file is required",
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Explain this screenshot clearly." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      explanation: response.choices[0].message.content,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze screenshot",
    });
  }
});

module.exports = router;
