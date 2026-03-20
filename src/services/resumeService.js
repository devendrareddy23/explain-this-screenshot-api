const OpenAI = require("openai");

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

async function generateTailoredResume({ resumeText, jobDescription }) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY is missing in local environment.");
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an expert resume tailoring assistant. Rewrite the resume to better match the job description without inventing fake experience. Return structured output with these exact sections: Professional Summary, Key Skills, Tailored Experience Points, Suggested Projects, ATS Keywords."
      },
      {
        role: "user",
        content: `RESUME:\n${resumeText || ""}\n\nJOB DESCRIPTION:\n${jobDescription || ""}`
      }
    ]
  });

  return response.choices?.[0]?.message?.content || "No tailored resume generated.";
}

module.exports = {
  generateTailoredResume,
};
