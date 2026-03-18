const fs = require("fs");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

<<<<<<< HEAD
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
=======
const explainScreenshot = async ({ filePath, errorText }) => {
  const hasImage = !!filePath;
  const hasErrorText = !!errorText;

  if (!hasImage && !hasErrorText) {
    throw new Error("Please provide a screenshot or error text.");
  }
>>>>>>> 4fd8900 (Stripe payments working)

  const content = [
    {
      type: "text",
      text: `
You are an expert senior software engineer and debugging assistant.

<<<<<<< HEAD
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
=======
Your job:
- Analyze the screenshot and/or pasted error text
- Explain the issue in a simple but useful way
- Focus on coding, terminal, browser, framework, API, deployment, build, and runtime errors
- Give practical fixes developers can use immediately

VERY IMPORTANT:
Return your answer in EXACTLY this format with these section titles and nothing else:

Problem:
<1 to 3 lines>

Explanation:
<clear explanation in simple words>

Quick Fix:
- <short actionable fix 1>
- <short actionable fix 2>
- <short actionable fix 3>

Commands to Run:
<only commands if needed, otherwise write "None">

Solution:
<the proper full solution>

Steps:
1. <step one>
2. <step two>
3. <step three>

Prevention Tip:
<one short practical tip>

Rules:
- Keep Quick Fix very short and immediately useful
- Commands must be terminal commands only
- If no commands are needed, write "None"
- Do not add markdown code fences
- Do not add extra headings
- Do not add intro or outro text
- If the screenshot is unclear, make the best grounded guess and mention uncertainty inside Explanation
`,
    },
  ];

  if (hasErrorText) {
    content.push({
      type: "text",
      text: `User provided error text:\n${errorText}`,
    });
  }

  if (hasImage) {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");

    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${base64Image}`,
      },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content,
      },
    ],
    max_tokens: 900,
  });

  return response.choices[0].message.content;
};
>>>>>>> 4fd8900 (Stripe payments working)

module.exports = { explainScreenshot };
