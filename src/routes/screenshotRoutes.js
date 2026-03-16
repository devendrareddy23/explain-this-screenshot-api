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

const cleanStepText = (step) => {
  if (!step || typeof step !== "string") return "";
  return step.replace(/^\s*\d+[\.\)]\s*/, "").trim();
};

const cleanCommandText = (command) => {
  if (!command || typeof command !== "string") return "";
  return command.trim();
};

const formatExplanation = ({
  problem,
  explanation,
  commands,
  solution,
  steps,
}) => {
  const safeCommands = Array.isArray(commands)
    ? commands.map(cleanCommandText).filter(Boolean)
    : [];

  const safeSteps = Array.isArray(steps)
    ? steps.map(cleanStepText).filter(Boolean)
    : [];

  const commandsText =
    safeCommands.length > 0
      ? safeCommands.join("\n")
      : "No exact command is appropriate for this issue.";

  const stepsText =
    safeSteps.length > 0
      ? safeSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")
      : "1. Review the error carefully.\n2. Check the related code or server logs.\n3. Apply the suggested fix and test again.";

  return `Problem:
${problem || "Unable to identify the main problem from the screenshot."}

Explanation:
${explanation || "No detailed explanation was returned."}

Commands to Run:
${commandsText}

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
You are an expert software engineer and debugging mentor.

Analyze the screenshot and return ONLY valid JSON in this exact format:

{
  "problem": "short description of the error",
  "explanation": "clear beginner-friendly explanation",
  "commands": ["command 1", "command 2"],
  "solution": "what the user should do",
  "steps": ["step 1", "step 2", "step 3"]
}

Rules:
- Focus on developer, terminal, backend, API, deployment, and coding errors
- Only include commands if they are truly relevant to the screenshot
- Do NOT invent package install commands unless the screenshot clearly shows a missing package/module issue
- Do NOT give random setup commands
- If no exact command is appropriate, return an empty commands array
- Steps must NOT be pre-numbered
- Commands must be copy-paste ready
- Keep the explanation practical and simple
- If the screenshot is not a coding error, still fill all fields clearly
- Return JSON only
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
      max_tokens: 600,
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
