const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateTailoredResume = async ({ resumeText, jobDescription }) => {
  const prompt = `
You are an expert backend engineering career assistant.

The user will provide:
1. Their current resume text
2. A target job description

Your job:
- Rewrite the resume to better match the job
- Keep it realistic and truthful
- Do not invent fake companies or fake experience
- Improve wording, relevance, and keyword alignment
- Make it strong for ATS and recruiters

Return the response in this exact format:

MATCH SCORE:
<percentage score out of 100>

MISSING KEYWORDS:
- keyword 1
- keyword 2
- keyword 3

TAILORED SUMMARY:
<short improved summary>

TAILORED EXPERIENCE:
<improved experience bullets>

TAILORED SKILLS:
<improved skills section>

RECRUITER MESSAGE:
<a short message user can send to recruiter>

RESUME:
<full tailored resume version>

CURRENT RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content:
          "You are a precise resume tailoring assistant for software engineers.",
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
  generateTailoredResume,
};
