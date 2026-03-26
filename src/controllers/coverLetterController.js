import OpenAI from "openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
};

export const generateCoverLetter = async (req, res) => {
  try {
    const { resumeText, jobDescription, companyName, roleTitle } = req.body || {};

    const safeResumeText = (resumeText || "").trim();
    const safeJobDescription = (jobDescription || "").trim();
    const safeCompanyName = (companyName || "").trim();
    const safeRoleTitle = (roleTitle || "").trim();

    if (!safeResumeText || !safeJobDescription) {
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
- Use ONLY the current request data
- Do NOT assume Node.js, backend, Java, Python, QA, product, or any other domain unless present in the input
- Do NOT inject any default candidate profile
- Do NOT reuse previous user data
- Do NOT invent fake experience, fake projects, or fake company names
- Keep the letter realistic, concise, and tailored to the provided resume and job description
- Return plain text only

STRUCTURE:
- Greeting
- Short intro showing interest in the role
- Why the candidate is a strong fit based on the provided resume
- Relevant skills and experience aligned to the job description
- Confident closing
          `.trim(),
        },
        {
          role: "user",
          content: `
RESUME:
${safeResumeText}

JOB DESCRIPTION:
${safeJobDescription}

COMPANY:
${safeCompanyName || "Not specified"}

ROLE:
${safeRoleTitle || "Not specified"}
          `.trim(),
        },
      ],
    });

    const coverLetter =
      response.choices?.[0]?.message?.content?.trim() || "No cover letter generated.";

    return res.status(200).json({
      success: true,
      message: "Cover letter generated successfully.",
      coverLetter,
      result: coverLetter,
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
