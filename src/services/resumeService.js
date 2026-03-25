import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

export async function generateTailoredResume({ resumeText, jobDescription }) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OPENAI_API_KEY is missing in environment.");
  }

  const safeResumeText = (resumeText || "").trim();
  const safeJobDescription = (jobDescription || "").trim();

  if (!safeResumeText || !safeJobDescription) {
    throw new Error("resumeText and jobDescription are required.");
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `
You are an expert resume tailoring assistant.

STRICT RULES:
- Use ONLY the resume text and job description provided in this request
- Do NOT inject any default candidate profile
- Do NOT assume Node.js, backend, or any other technology unless it appears in the input
- Do NOT invent fake experience, fake metrics, fake companies, or fake projects
- Rewrite the resume so it better matches the target job description
- Keep the content ATS-friendly and professional
- Return plain text only

RETURN FORMAT:
Professional Summary
Key Skills
Tailored Experience Points
Suggested Projects
ATS Keywords
        `.trim(),
      },
      {
        role: "user",
        content: `
RESUME:
${safeResumeText}

JOB DESCRIPTION:
${safeJobDescription}
        `.trim(),
      },
    ],
  });

  return response.choices?.[0]?.message?.content?.trim() || "No tailored resume generated.";
}
