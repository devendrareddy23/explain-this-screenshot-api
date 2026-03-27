import OpenAI from "openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to your backend .env file and restart the server."
    );
  }

  return new OpenAI({ apiKey });
};

export const generateCoverLetter = async (resumeText, jobDescription) => {
  const openai = getOpenAIClient();

  const prompt = `
You are a senior hiring manager.

Write a cover letter that makes this candidate feel worth interviewing.

STRICT RULES:
- Do not use weak openings like "I am excited to apply"
- Do not sound generic or AI-written
- Sound confident, sharp, and relevant
- Keep it under 220 words
- Match the job description closely
- Highlight measurable value and business impact
- Make the candidate sound credible and strong
- This should feel like a cover letter that survives recruiter screening

OUTPUT:
Return only the final cover letter text. No headings. No explanation.

CANDIDATE RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content;
};

export default generateCoverLetter;
