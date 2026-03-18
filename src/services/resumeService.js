const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const buildTailoredResume = async ({ resumeText, jobDescription }) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: `
You are an expert technical resume strategist and ATS optimization assistant.

Your job:
- Analyze the user's current resume
- Analyze the target job description
- Rewrite the resume to align better with the job
- Keep the resume truthful and realistic
- Do NOT invent fake companies, fake degrees, fake years, fake tools, or fake achievements
- You may rephrase, reorder, sharpen, and better present the user's real experience
- Improve clarity, ATS keyword alignment, and impact
- Focus especially on backend, software engineering, Node.js, Express, MongoDB, APIs, cloud, debugging, deployment, and developer roles when relevant
- Return concise but strong content
- Keep the tone professional and recruiter-friendly

Return plain text in EXACTLY this structure:

Match Score:
<0 to 100>

Missing Keywords:
- <keyword 1>
- <keyword 2>
- <keyword 3>

Tailored Summary:
<3 to 5 lines>

Tailored Skills:
- <skill 1>
- <skill 2>
- <skill 3>
- <skill 4>
- <skill 5>
- <skill 6>

Rewritten Experience Bullets:
- <bullet 1>
- <bullet 2>
- <bullet 3>
- <bullet 4>
- <bullet 5>

Project Improvements:
- <project bullet 1>
- <project bullet 2>
- <project bullet 3>

ATS Tips:
- <tip 1>
- <tip 2>
- <tip 3>

Tailored Resume:
<full improved resume text in plain text, clean sections, no markdown tables, no code fences>

Rules:
- Be truthful
- Do not invent experience the user does not have
- Prefer stronger wording over generic wording
- Use keywords from the JD when supported by the user's background
- Keep the tailored resume realistic for actual job applications
- No intro text
- No outro text

Current Resume:
${resumeText}

Target Job Description:
${jobDescription}
`,
      },
    ],
    max_tokens: 1800,
  });

  return response.choices[0].message.content;
};

module.exports = {
  buildTailoredResume,
};
