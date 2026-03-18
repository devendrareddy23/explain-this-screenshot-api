const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function explainScreenshot({ errorText, imageBase64 }) {
  try {
    const systemPrompt = `
You are a senior debugging engineer.

A user gives you an error message or screenshot content.

Your job:
1. Detect the likely stack/framework/tool involved.
2. Give fast, practical fixes.
3. Keep output short, clear, and useful for a developer at work.

You must respond STRICTLY in this format:

Stack:
(one short value only, like React, Node.js, Express, MongoDB, Python, SQL, Docker, Git, General)

Problem:
(1 short line)

Quick Fix:
(1-2 short lines)

Explanation:
(short explanation only)

Commands to Run:
(copy-paste terminal commands only, or "None")

Code Fix:
(code snippet if needed, or "None")

Steps:
(short numbered or line-separated steps)

Next Best Action:
(what to try next if this doesn't fix it)

Prevent This:
(how to avoid this problem in future)

Rules:
- Be practical, not academic
- Prefer action over theory
- Do not write long paragraphs
- If no commands are needed, write "None"
- If no code fix is needed, write "None"
`;

    const userPromptParts = [];

    if (errorText && errorText.trim()) {
      userPromptParts.push(`Error text:\n${errorText.trim()}`);
    }

    if (imageBase64) {
      userPromptParts.push(
        "A screenshot was also provided. Use it if needed to infer the issue."
      );
    }

    const userContent = userPromptParts.join("\n\n") || "Analyze the issue.";

    const input = [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
    ];

    if (imageBase64) {
      input.push({
        role: "user",
        content: [
          { type: "input_text", text: userContent },
          {
            type: "input_image",
            image_url: `data:image/png;base64,${imageBase64}`,
          },
        ],
      });
    } else {
      input.push({
        role: "user",
        content: [{ type: "input_text", text: userContent }],
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    const outputText = response.output_text || "";

    return {
      raw: outputText,
      stack: extractSection(outputText, "Stack"),
      problem: extractSection(outputText, "Problem"),
      quickFix: extractSection(outputText, "Quick Fix"),
      explanation: extractSection(outputText, "Explanation"),
      commandsToRun: extractSection(outputText, "Commands to Run"),
      codeFix: extractSection(outputText, "Code Fix"),
      steps: extractList(outputText, "Steps"),
      nextBestAction: extractSection(outputText, "Next Best Action"),
      preventThis: extractSection(outputText, "Prevent This"),
    };
  } catch (error) {
    console.error("explainScreenshot error:", error);
    throw error;
  }
}

function extractSection(text, title) {
  if (!text) return "";

  const escapedTitle = escapeRegExp(title);
  const regex = new RegExp(
    `${escapedTitle}:\\s*([\\s\\S]*?)(?=\\n[A-Za-z][A-Za-z\\s]+:|$)`,
    "i"
  );

  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function extractList(text, title) {
  const section = extractSection(text, title);
  if (!section) return [];

  return section
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { explainScreenshot };
