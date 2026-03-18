const fs = require("fs");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const explainScreenshot = async ({ filePath, errorText }) => {
  const hasImage = !!filePath;
  const hasErrorText = !!errorText;

  if (!hasImage && !hasErrorText) {
    throw new Error("Please provide a screenshot or error text.");
  }

  const content = [
    {
      type: "text",
      text: `
You are an expert senior software engineer and debugging assistant.

Your job:
- Analyze the screenshot and/or pasted error text
- Detect the likely stack when possible (JavaScript, React, Node.js, Express, MongoDB, HTML, CSS, Python, Java, etc.)
- Explain the issue in a simple but useful way
- Focus on coding, terminal, browser, framework, API, deployment, build, and runtime errors
- Give practical fixes developers can use immediately

Return valid plain text in EXACTLY this structure:

Stack:
<detected stack or "Unknown">

Problem:
<1 to 3 lines>

Quick Fix:
- <short actionable fix 1>
- <short actionable fix 2>
- <short actionable fix 3>

Explanation:
<clear explanation in simple words>

Commands to Run:
<only terminal commands if needed, otherwise write "None">

Code Fix:
<small code snippet or exact code change if helpful, otherwise write "None">

Steps:
1. <step one>
2. <step two>
3. <step three>

Next Best Action:
<the next most useful debugging action>

Prevent This:
<one short practical prevention tip>

Rules:
- Keep Quick Fix short and immediately useful
- Commands must be terminal commands only
- If no commands are needed, write "None"
- Code Fix can be a short snippet
- Do not use markdown code fences
- Do not add extra headings
- Do not add intro or outro text
- If the screenshot is unclear, make the best grounded guess and mention uncertainty in Explanation
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

module.exports = {
  explainScreenshot,
};
