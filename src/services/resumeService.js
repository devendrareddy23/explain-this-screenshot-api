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

async function tailorResume({ resumeText, jobDescription }) {
  const prompt = `
You are an expert resume strategist and ATS optimizer.

Tailor the user's resume to the given job description.

Return the response in EXACTLY this plain text format:

MATCH SCORE:
<number from 1 to 100>

SUGGESTED JOB TITLE:
<best-fit job title>

PROFESSIONAL SUMMARY:
<3 to 5 lines>

TAILORED SKILLS:
- skill 1
- skill 2
- skill 3
- skill 4
- skill 5

TAILORED EXPERIENCE:
- bullet 1
- bullet 2
- bullet 3
- bullet 4

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

COVER LETTER:
<short professional cover letter>

RULES:
- Do not invent fake companies or fake experience.
- Improve wording, but keep everything believable.
- Be ATS-friendly.
- Keep output plain text only.
- Keep it strong, practical, and professional.

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
    matchScore: extractSection(rawText, "MATCH SCORE:", [
      "SUGGESTED JOB TITLE:",
    ]),
    suggestedJobTitle: extractSection(rawText, "SUGGESTED JOB TITLE:", [
      "PROFESSIONAL SUMMARY:",
    ]),
    professionalSummary: extractSection(rawText, "PROFESSIONAL SUMMARY:", [
      "TAILORED SKILLS:",
    ]),
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
      "COVER LETTER:",
    ]),
    coverLetter: extractSection(rawText, "COVER LETTER:"),
  };
}

module.exports = {
  tailorResume,
};
