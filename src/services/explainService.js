const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const explainScreenshot = async (imageBuffer) => {
  const base64Image = imageBuffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are an expert software engineer and technical mentor.

When analyzing screenshots you MUST respond in this format:

Problem:
(What is happening in the screenshot)

Explanation:
(Explain clearly what the screenshot means)

Solution:
(Describe the fix)

Steps to Fix:
1.
2.
3.

Important rules:
- Be very clear and beginner friendly
- If it's a coding or terminal error give exact commands
- If it's UI explain what the user is seeing
- Never say "I cannot see the screenshot" if an image exists
`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Explain this screenshot clearly.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  return response.choices[0].message.content;
};

module.exports = {
  explainScreenshot,
};
