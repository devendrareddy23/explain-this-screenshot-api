import { checkAndUpdateUsage } from "../utils/usage.js";

export const generateCoverLetter = async (req, res) => {
  try {
    const userId = req.user._id;

    const usage = await checkAndUpdateUsage(userId, "coverLetter");

    if (!usage.allowed) {
      return res.status(403).json({
        success: false,
        message: "Daily cover letter limit reached. Upgrade to Pro.",
      });
    }

    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeText and jobDescription are required.",
      });
    }

    const result = `
Dear Hiring Team,

I am excited to apply for this opportunity. My background includes hands-on experience with Node.js, Express.js, MongoDB, REST APIs, authentication, deployment, and production debugging.

My experience aligns well with the role because I have built backend systems, worked on API development, deployed applications to cloud environments, and improved real-world developer tools. I focus on building practical, scalable solutions with clean structure and reliable behavior.

In recent projects, I developed and deployed backend applications with authentication, resume tailoring workflows, cover letter generation, and usage-based SaaS logic. I also worked on production-style deployment using AWS EC2, Nginx, PM2, and cloud-based hosting.

I would welcome the opportunity to contribute my backend development skills, problem-solving ability, and product mindset to your team.

Thank you for your time and consideration.

Sincerely,
${req.user.name}
    `.trim();

    return res.status(200).json({
      success: true,
      result,
      usage,
    });
  } catch (error) {
    console.error("Cover letter error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate cover letter.",
    });
  }
};
