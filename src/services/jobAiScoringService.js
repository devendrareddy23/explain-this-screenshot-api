import OpenAI from "openai";
import { OPENAI_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
};

const fallbackScore = (job) => {
  const baseScore = Number(job?.matchScore || job?.score || 0);
  const normalized = Math.max(1, Math.min(10, Math.round(baseScore / 10)));

  return {
    score: normalized,
    reason: "Fallback score derived from match score because AI scoring was unavailable.",
  };
};

export const scoreJobOutOfTen = async ({ resumeText, job }) => {
  if (!resumeText || !job?.description) {
    return fallbackScore(job);
  }

  const client = getOpenAIClient();

  if (!client) {
    return fallbackScore(job);
  }

  try {
    const response = await withServiceTimeout(
      () =>
        client.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You score job fit honestly. Return JSON with score (integer 1-10) and reason (short string).",
            },
            {
              role: "user",
              content: `Resume:\n${resumeText}\n\nJob title: ${job.title || ""}\nCompany: ${
                job.company || ""
              }\nDescription:\n${job.description || ""}\n\nScore this job fit from 1 to 10. Use 8 or above only for strong, realistic fit.`,
            },
          ],
        }),
      OPENAI_TIMEOUT_MS,
      "Job AI scoring timed out."
    );

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const score = Math.max(1, Math.min(10, Number(parsed.score) || fallbackScore(job).score));

    return {
      score,
      reason: String(parsed.reason || "AI score generated."),
    };
  } catch (error) {
    return fallbackScore(job);
  }
};
