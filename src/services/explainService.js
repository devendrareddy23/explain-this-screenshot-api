const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function explainScreenshot({ errorText, imageBase64 }) {
  try {
    const prompt = `
You are a senior backend engineer.

User gives an error.

Your job:
Give FAST, PRACTICAL FIX.

Output STRICTLY in this format:

Problem:
(1 line)

Quick Fix:
(1-2 lines)

Commands to Run:
(copy-paste commands only)

Code Fix:
(code snippet if needed)

Steps:
(short steps)

Next Best Action:
(what user should try next if fix doesn't work)

Prevent This:
(how to avoid this issue in future)

Rules:
- no long explanations
- focus on action
- think like fixing production bug fast
`;

    const userContent = errorText
      ? `Error:\n${errorText}`
      : "Analyze the screenshot and explain the issue.";

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const outputText = response.output_text;

    return {
      raw: outputText,
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
  const regex = new RegExp(`${title}:(.*?)(\\n\\w+:|$)`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function extractList(text, title) {
  const section = extractSection(text, title);
  if (!section) return [];
  return section.split("\n").map((line) => line.trim()).filter(Boolean);
}

module.exports = { explainScreenshot };
