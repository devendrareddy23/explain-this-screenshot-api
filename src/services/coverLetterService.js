import OpenAI from "openai";
import { OPENAI_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to your backend .env file and restart the server."
    );
  }

  return new OpenAI({ apiKey });
};

export const generateCoverLetter = async (
  resumeText,
  jobDescription,
  companyName = "",
  jobTitle = ""
) => {
  const openai = getOpenAIClient();
  const resumeSummary = String(resumeText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);

  const prompt = `You are a world class career coach writing a 
cover letter for a job application.

Candidate background: [${resumeSummary}]
Job title: [${jobTitle || ""}]
Company name: [${companyName || ""}]
Job description: [${jobDescription}]

Write a cover letter that:
- Opens with a powerful hook specific to this company
- Shows genuine knowledge of what the company does
- Connects candidate skills directly to job requirements
- Ends with confident call to action
- Sounds human, not AI-generated
- Is exactly 3 paragraphs, under 300 words`;

  console.log("Cover letter prompt payload:", {
    companyName,
    jobTitle,
    resumeSummaryLength: resumeSummary.length,
    jobDescriptionLength: String(jobDescription || "").length,
  });

  const response = await withServiceTimeout(
    () =>
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "Write only the cover letter text. Keep it specific, credible, and natural. Do not use bullet points, placeholders, or AI-sounding phrasing.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    OPENAI_TIMEOUT_MS,
    "Cover letter generation timed out."
  );

  return response.choices[0].message.content?.trim() || "";
};

export default generateCoverLetter;
