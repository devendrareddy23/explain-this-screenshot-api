const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractSection(text, sectionName, nextSectionNames = []) {
  const escapedSection = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextPattern =
    nextSectionNames.length > 0
      ? nextSectionNames
          .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")
      : null;

  const regex = nextPattern
    ? new RegExp(
        `${escapedSection}:\\s*([\\s\\S]*?)(?=\\n(?:${nextPattern}):|$)`,
        "i"
      )
    : new RegExp(`${escapedSection}:\\s*([\\s\\S]*)`, "i");

  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function parseAiResponse(text) {
  const problem = extractSection(text, "Problem", [
    "Quick Fix",
    "Explanation",
    "Commands to Run",
    "Code Fix",
    "Steps",
  ]);

  const quickFix = extractSection(text, "Quick Fix", [
    "Explanation",
    "Commands to Run",
    "Code Fix",
    "Steps",
  ]);

  const explanation = extractSection(text, "Explanation", [
    "Commands to Run",
    "Code Fix",
    "Steps",
  ]);

  const commandsToRun = extractSection(text, "Commands to Run", [
    "Code Fix",
    "Steps",
  ]);

  const codeFix = extractSection(text, "Code Fix", ["Steps"]);

  const stepsRaw = extractSection(text, "Steps");
  const steps = stepsRaw
    ? stepsRaw
        .split("\n")
        .map((line) => line.replace(/^\d+[\).\s-]*/, "").trim())
        .filter(Boolean)
    : [];

  return {
    raw: text,
    problem,
    quickFix,
    explanation,
    commandsToRun,
    codeFix,
    steps,
  };
}

async function explainScreenshot({ imageBase64, mimeType, errorText }) {
  const prompt = `
You are a senior debugging assistant for software developers.

The user may provide:
1. A screenshot of an error
2. Raw pasted error text
3. Both

Analyze the issue and return the answer in EXACTLY this format:

Problem:
<short and clear description of the real issue>

Quick Fix:
<fastest practical fix in 1-2 lines>

Explanation:
<brief explanation of why the error happened>

Commands to Run:
<terminal commands only if needed, otherwise write "None">

Code Fix:
<small corrected code snippet if useful, otherwise write "None">

Steps:
1. <step 1>
2. <step 2>
3. <step 3>

Rules:
- Keep it practical
- Keep it short
- Focus on real debugging help
- Prefer developer-friendly answers
- If unsure, clearly say what needs to be checked
`;

  const content = [{ type: "text", text: prompt }];

  if (errorText && errorText.trim()) {
    content.push({
      type: "text",
      text: `User pasted error text:\n${errorText.trim()}`,
    });
  }

  if (imageBase64 && mimeType) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
      },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content,
      },
    ],
    temperature: 0.2,
  });

  const aiText = response.choices?.[0]?.message?.content || "No response from AI.";
  return parseAiResponse(aiText);
}

module.exports = {
  explainScreenshot,
};
