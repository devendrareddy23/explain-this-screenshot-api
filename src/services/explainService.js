const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateExplanation = async ({ errorText }) => {
  const prompt = `
You are an expert software debugging assistant.

The user will give you an error message or coding issue.

Return the answer in this exact format:

Problem:
<what the problem is>

Explanation:
<simple explanation>

Commands to Run:
<commands if needed, otherwise write None>

Solution:
<best solution>

Steps:
1. step one
2. step two
3. step three

ERROR:
${errorText}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "You are a precise debugging assistant for developers.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content;
};

module.exports = {
  generateExplanation,
};
