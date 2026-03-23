import { checkAndUpdateUsage } from "../utils/usage.js";

export const generateResume = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔥 STEP 1: Check usage BEFORE doing AI work
    const usage = await checkAndUpdateUsage(userId, "resume");

    if (!usage.allowed) {
      return res.status(403).json({
        success: false,
        message: "Daily resume limit reached. Upgrade to Pro.",
      });
    }

    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeText and jobDescription are required.",
      });
    }

    // 🔥 STEP 2: Call your AI (keep your real logic here)
    // Replace below with your actual OpenAI call if needed

    const result = `
Tailored Resume:

- Optimized for job description
- Highlighted relevant skills
- Improved alignment with role

(Replace this with real AI output)
`;

    // 🔥 STEP 3: Return usage info also (frontend needs this)
    return res.json({
      success: true,
      result,
      usage,
    });
  } catch (error) {
    console.error("Resume tailor error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate resume.",
    });
  }
};
