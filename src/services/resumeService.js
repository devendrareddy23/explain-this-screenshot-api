import OpenAI from "openai";
import { OPENAI_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

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
  const prompt = `You are an expert ATS resume optimizer.
Given this resume: [${resumeText}]
And this job description: [${jobDescription}]
Return a JSON with:
- tailoredResume: full rewritten resume optimized for this JD
- matchScore: score out of 100
- keywordsAdded: list of keywords inserted
- improvementSummary: 3 bullet points of what changed`;

  const response = await withServiceTimeout(
    () =>
      client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return valid JSON only. Keep the rewritten resume truthful to the source resume and do not invent experience.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    OPENAI_TIMEOUT_MS,
    "Resume tailoring timed out."
  );

  const raw = response.choices?.[0]?.message?.content || "{}";
  console.log("AI response:", raw);
  const parsed = JSON.parse(raw);

  return {
    tailoredResume: String(parsed.tailoredResume || "").trim(),
    matchScore: Math.max(0, Math.min(100, Number(parsed.matchScore) || 0)),
    keywordsAdded: Array.isArray(parsed.keywordsAdded)
      ? parsed.keywordsAdded.map((item) => String(item).trim()).filter(Boolean)
      : [],
    improvementSummary: Array.isArray(parsed.improvementSummary)
      ? parsed.improvementSummary.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
      : [],
  };
};

const VARIANT_PROMPTS = {
  A: "Version A — Skills-forward. Lead with tech stack, tools, systems, and capability density.",
  B: "Version B — Achievement-forward. Lead with quantified results, wins, and business impact.",
  C: "Version C — Story-forward. Lead with a compelling, truthful career narrative and momentum arc.",
};

export const generateResumeVariants = async (resumeText, jobDescription) => {
  if (!resumeText || !jobDescription) {
    throw new Error("Missing resume or job description");
  }

  const client = getOpenAIClient();
  const prompt = `You are an expert ATS resume optimizer.
Given this source resume: [${resumeText}]
And this job description: [${jobDescription}]

Create 3 truthful resume versions for the same candidate:
- Version A: Skills-forward
- Version B: Achievement-forward
- Version C: Story-forward

Return JSON only in this format:
{
  "variants": [
    {
      "variantId": "A",
      "label": "Skills-forward",
      "strategy": "short description",
      "tailoredResume": "full rewritten resume",
      "matchScore": 0-100,
      "keywordsAdded": ["keyword"],
      "improvementSummary": ["bullet 1", "bullet 2", "bullet 3"]
    },
    {
      "variantId": "B",
      "label": "Achievement-forward",
      "strategy": "short description",
      "tailoredResume": "full rewritten resume",
      "matchScore": 0-100,
      "keywordsAdded": ["keyword"],
      "improvementSummary": ["bullet 1", "bullet 2", "bullet 3"]
    },
    {
      "variantId": "C",
      "label": "Story-forward",
      "strategy": "short description",
      "tailoredResume": "full rewritten resume",
      "matchScore": 0-100,
      "keywordsAdded": ["keyword"],
      "improvementSummary": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ]
}`;

  const response = await withServiceTimeout(
    () =>
      client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return valid JSON only. Keep every version truthful to the source resume and do not invent experience.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    OPENAI_TIMEOUT_MS,
    "Resume variant generation timed out."
  );

  const raw = response.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  const variants = Array.isArray(parsed.variants) ? parsed.variants : [];

  return ["A", "B", "C"].map((variantId) => {
    const found = variants.find((item) => String(item?.variantId || "").toUpperCase() === variantId) || {};
    return {
      variantId,
      label:
        found.label ||
        (variantId === "A" ? "Skills-forward" : variantId === "B" ? "Achievement-forward" : "Story-forward"),
      strategy: String(found.strategy || VARIANT_PROMPTS[variantId]).trim(),
      text: String(found.tailoredResume || "").trim(),
      matchScore: Math.max(0, Math.min(100, Number(found.matchScore) || 0)),
      keywordsAdded: Array.isArray(found.keywordsAdded)
        ? found.keywordsAdded.map((item) => String(item).trim()).filter(Boolean)
        : [],
      improvementSummary: Array.isArray(found.improvementSummary)
        ? found.improvementSummary.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : [],
    };
  });
};

export const generateTailoredResume = async (resumeText, jobDescription) => {
  return tailorResume(resumeText, jobDescription);
};

export default tailorResume;
