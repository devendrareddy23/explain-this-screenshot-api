const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const extractJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Could not extract JSON from AI response.");
    }
    return JSON.parse(match[0]);
  }
};

const buildPrompt = (resumeText, jobDescription) => {
  return `
You are an expert ATS resume tailoring assistant.

Your job:
- Compare the candidate's resume against the job description
- Improve the resume so it matches the role better
- Be honest and do NOT invent fake experience
- Only strengthen wording, add missing keywords if they are reasonably implied, and improve structure
- Make the result feel premium and professional
- Return valid JSON only
- Do not wrap output in markdown
- Do not include triple backticks

Candidate Resume:
${resumeText}

Job Description:
${jobDescription}

Return this exact JSON structure:

{
  "matchScore": 0,
  "missingKeywords": [],
  "tailoredSummary": "",
  "tailoredSkills": [],
  "rewrittenExperienceBullets": [],
  "projectImprovements": [],
  "atsTips": [],
  "coverLetter": "",
  "tailoredResume": {
    "name": "",
    "title": "",
    "summary": "",
    "skills": [],
    "experienceBullets": [],
    "projects": []
  }
}

Rules:
- matchScore must be a number from 0 to 100
- missingKeywords must be an array of strings
- tailoredSkills must be an array of strings
- rewrittenExperienceBullets must be an array of strong bullet points
- projectImprovements must be an array of realistic project bullets
- atsTips must be an array of practical ATS suggestions
- coverLetter must be 1 short professional cover letter
- tailoredResume.summary must be concise and strong
- tailoredResume.skills must be an array
- tailoredResume.experienceBullets must be an array
- tailoredResume.projects must be an array
- Keep the output realistic for the user's background
`;
};

const formatTailoredResumeText = (resume) => {
  const skillsText = (resume.skills || []).map((item) => `- ${item}`).join("\n");
  const experienceText = (resume.experienceBullets || [])
    .map((item) => `- ${item}`)
    .join("\n");
  const projectsText = (resume.projects || []).map((item) => `- ${item}`).join("\n");

  return `${resume.name || "Candidate"}
${resume.title || ""}

SUMMARY
${resume.summary || ""}

SKILLS
${skillsText || "- Not available"}

EXPERIENCE
${experienceText || "- Not available"}

PROJECTS
${projectsText || "- Not available"}
`.trim();
};

const tailorResume = async (resumeText, jobDescription) => {
  const prompt = buildPrompt(resumeText, jobDescription);

  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    input: prompt,
  });

  const rawText = response.output_text;
  const parsed = extractJson(rawText);

  const result = {
    matchScore: Number(parsed.matchScore || 0),
    missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
    tailoredSummary: parsed.tailoredSummary || "",
    tailoredSkills: Array.isArray(parsed.tailoredSkills) ? parsed.tailoredSkills : [],
    rewrittenExperienceBullets: Array.isArray(parsed.rewrittenExperienceBullets)
      ? parsed.rewrittenExperienceBullets
      : [],
    projectImprovements: Array.isArray(parsed.projectImprovements)
      ? parsed.projectImprovements
      : [],
    atsTips: Array.isArray(parsed.atsTips) ? parsed.atsTips : [],
    coverLetter: parsed.coverLetter || "",
    tailoredResume: {
      name: parsed.tailoredResume?.name || "Candidate",
      title: parsed.tailoredResume?.title || "Professional",
      summary: parsed.tailoredResume?.summary || "",
      skills: Array.isArray(parsed.tailoredResume?.skills) ? parsed.tailoredResume.skills : [],
      experienceBullets: Array.isArray(parsed.tailoredResume?.experienceBullets)
        ? parsed.tailoredResume.experienceBullets
        : [],
      projects: Array.isArray(parsed.tailoredResume?.projects)
        ? parsed.tailoredResume.projects
        : [],
    },
  };

  result.tailoredResumeText = formatTailoredResumeText(result.tailoredResume);

  return result;
};

module.exports = {
  tailorResume,
};
