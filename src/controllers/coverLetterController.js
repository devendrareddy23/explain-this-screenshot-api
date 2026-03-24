import OpenAI from "openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
};

export const generateCoverLetter = async (req, res) => {
  try {
    const { resumeText, jobDescription, companyName, roleTitle } = req.body || {};

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeText and jobDescription are required.",
      });
    }

    const client = getOpenAIClient();

    if (!client) {
      return res.status(500).json({
        success: false,
        message: "OpenAI API key missing.",
      });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `
You are an expert job application writer.

STRICT RULES:
- Do NOT assume any specific technology (Node.js, Java, etc.) unless provided
- Use ONLY the resumeText and jobDescription provided
- Do NOT reuse previous user's data
- Do NOT inject default profiles
- Keep it realistic and tailored

STRUCTURE:
- Short intro (role + interest)
- Why candidate is strong fit
- Skills aligned with job description
- 1–2 relevant achievements
- Confident closing

No markdown. Plain clean text.
          `,
        },
        {
          role: "user",
          content: `
RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

COMPANY:
${companyName || "Not specified"}

ROLE:
${roleTitle || "Not specified"}
          `,
        },
      ],
    });

    const coverLetter =
      response.choices?.[0]?.message?.content || "No cover letter generated.";

    return res.json({
      success: true,
      coverLetter,
    });
  } catch (error) {
    console.error("Cover letter error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate cover letter.",
      error: error.message,
    });
  }
};
