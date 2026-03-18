const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractSection(text, startLabel, endLabels = []) {
  const startIndex = text.indexOf(startLabel);
  if (startIndex === -1) return "";

  const contentStart = startIndex + startLabel.length;
  let endIndex = text.length;

  for (const label of endLabels) {
    const idx = text.indexOf(label, contentStart);
    if (idx !== -1 && idx < endIndex) {
      endIndex = idx;
    }
  }

  return text.slice(contentStart, endIndex).trim();
}

async function tailorResume({ resumeText, jobDescription, targetRole, locationPreference }) {
  const prompt = `
You are an expert technical recruiter, ATS evaluator, and resume strategist.

You will compare the user's real resume against a job description and return a job match dashboard.

Return the response in EXACTLY this plain text format:

MATCH SCORE:
<number from 1 to 100>

PRIORITY:
<High Priority / Apply / Maybe / Skip>

DECISION:
<one-line direct verdict>

SUGGESTED JOB TITLE:
<best-fit job title based on candidate and job>

PROFESSIONAL SUMMARY:
<3 to 5 lines tailored to the role>

STRENGTHS:
- strength 1
- strength 2
- strength 3
- strength 4
- strength 5

GAPS:
- gap 1
- gap 2
- gap 3
- gap 4
- gap 5

TAILORED SKILLS:
- skill 1
- skill 2
- skill 3
- skill 4
- skill 5
- skill 6
- skill 7
- skill 8

TAILORED EXPERIENCE:
- bullet 1
- bullet 2
- bullet 3
- bullet 4
- bullet 5

ATS KEYWORDS MATCHED:
- keyword 1
- keyword 2
- keyword 3
- keyword 4
- keyword 5

MISSING KEYWORDS:
- missing keyword 1
- missing keyword 2
- missing keyword 3
- missing keyword 4
- missing keyword 5

RECOMMENDED IMPROVEMENTS:
- improvement 1
- improvement 2
- improvement 3
- improvement 4
- improvement 5

COVER LETTER:
<short professional cover letter>

RULES:
- Be brutally practical.
- Do not invent fake companies, fake skills, fake projects, or fake years of experience.
- Only improve phrasing and positioning using the truth already present in the resume.
- If the user is weak for the role, say so clearly.
- Priority should mean:
  - High Priority = strong fit, user should definitely apply
  - Apply = good enough fit, worth applying
  - Maybe = possible but weaker fit
  - Skip = poor fit, not worth time
- Keep everything ATS-friendly and plain text only.

USER TARGET ROLE:
${targetRole || "Not provided"}

USER LOCATION PREFERENCE:
${locationPreference || "Not provided"}

USER RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  const rawText = response.output_text || "";

  return {
    rawText,
    matchScore: extractSection(rawText, "MATCH SCORE:", ["PRIORITY:"]),
    priority: extractSection(rawText, "PRIORITY:", ["DECISION:"]),
    decision: extractSection(rawText, "DECISION:", ["SUGGESTED JOB TITLE:"]),
    suggestedJobTitle: extractSection(rawText, "SUGGESTED JOB TITLE:", [
      "PROFESSIONAL SUMMARY:",
    ]),
    professionalSummary: extractSection(rawText, "PROFESSIONAL SUMMARY:", [
      "STRENGTHS:",
    ]),
    strengths: extractSection(rawText, "STRENGTHS:", ["GAPS:"]),
    gaps: extractSection(rawText, "GAPS:", ["TAILORED SKILLS:"]),
    tailoredSkills: extractSection(rawText, "TAILORED SKILLS:", [
      "TAILORED EXPERIENCE:",
    ]),
    tailoredExperience: extractSection(rawText, "TAILORED EXPERIENCE:", [
      "ATS KEYWORDS MATCHED:",
    ]),
    atsKeywordsMatched: extractSection(rawText, "ATS KEYWORDS MATCHED:", [
      "MISSING KEYWORDS:",
    ]),
    missingKeywords: extractSection(rawText, "MISSING KEYWORDS:", [
      "RECOMMENDED IMPROVEMENTS:",
    ]),
    recommendedImprovements: extractSection(
      rawText,
      "RECOMMENDED IMPROVEMENTS:",
      ["COVER LETTER:"]
    ),
    coverLetter: extractSection(rawText, "COVER LETTER:"),
  };
}

module.exports = {
  tailorResume,
};
