import OpenAI from "openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Add it to your backend .env file and restart the server.");
  }

  return new OpenAI({ apiKey });
};

export const tailorResume = async (resumeText, jobDescription) => {
  if (!resumeText || !jobDescription) {
    throw new Error("Missing resume or job description");
  }

  const client = getOpenAIClient();

  const prompt = `
You are a top FAANG-level recruiter.

Rewrite the candidate's resume to match the job description.

STRICT RULES:
- No generic text
- No apologies
- No placeholders
- No markdown formatting
- Use strong action verbs
- Make it ATS optimized
- Highlight measurable impact
- Tailor SUMMARY, SKILLS, EXPERIENCE, and PROJECTS to the job
- Keep it professional and concise

CANDIDATE RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

OUTPUT FORMAT:

SUMMARY:
...

SKILLS:
- ...
- ...

EXPERIENCE:
- ...
- ...

PROJECTS:
- ...
- ...
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are an expert recruiter and resume writer.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content;
};

export const generateTailoredResume = async (resumeText, jobDescription) => {
  return tailorResume(resumeText, jobDescription);
};

export default tailorResume;
