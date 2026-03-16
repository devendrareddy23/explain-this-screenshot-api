const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const formatExplanation = ({ problem, explanation, solution, steps }) => {
  const safeSteps = Array.isArray(steps) ? steps : [];

  const stepsText =
    safeSteps.length > 0
      ? safeSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")
      : "1. Check the screenshot details carefully.\n2. Review the related code or system.\n3. Apply the most likely fix and test again.";

  return `Problem:
${problem || "Unable to identify the main problem from the screenshot."}

Explanation:
${explanation || "No detailed explanation was returned."}

Solution:
${solution || "Review the screenshot context and apply the most likely fix."}

Steps to Fix:
${stepsText}`;
};

router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "OPENAI_API_KEY is missing on the server",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Screenshot file is required",
      });
    }

    if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    const mimeType = req.file.mimetype;
    const base64Image = req.file.buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are an expert software engineer, debugger, and technical mentor.

You must return ONLY valid JSON in this exact shape:

{
  "problem": "string",
  "explanation": "string",
  "solution": "string",
  "steps": ["step 1", "step 2", "step 3"]
}

Rules:
- Return JSON only
- Do not return markdown
- Do not return extra text
- Keep explanation beginner friendly
- If the screenshot shows an error, explain the likely cause
- If commands are relevant, include them inside the steps
- If the screenshot is a UI or general image, still fill all 4 fields clearly
`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this screenshot and return only valid JSON.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const rawContent = response?.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      return res.status(500).json({
        success: false,
        message: "No explanation returned from OpenAI",
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON:", rawContent);

      return res.status(500).json({
        success: false,
        message: "OpenAI returned invalid JSON format",
      });
    }

    const explanation = formatExplanation(parsed);

    return res.status(200).json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error("Screenshot analysis error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze screenshot",
    });
  }
});

module.exports = router;
