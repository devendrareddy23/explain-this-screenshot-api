const OpenAI = require("openai");

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

async function generateExplanation({ imageBase64, mimeType, errorText }) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY is missing in local environment.");
  }

  const userParts = [];

  if (errorText && String(errorText).trim()) {
    userParts.push({
      type: "text",
      text: `User provided error text:\n${String(errorText).trim()}`
    });
  }

  if (imageBase64) {
    userParts.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType || "image/png"};base64,${imageBase64}`
      }
    });
  }

  if (userParts.length === 0) {
    userParts.push({
      type: "text",
      text: "No screenshot was provided. Analyze the pasted error text only."
    });
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a senior software engineer helping developers debug coding errors from screenshots or pasted errors. Return a practical developer-friendly answer with these exact sections: Stack, Problem, Quick Fix, Explanation, Commands to Run, Solution, Steps. Keep commands concise and actionable. If commands are not needed, say None."
      },
      {
        role: "user",
        content: userParts
      }
    ],
    temperature: 0.2
  });

  return response.choices?.[0]?.message?.content || "No explanation generated.";
}

module.exports = {
  generateExplanation,
};
