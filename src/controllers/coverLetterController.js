import { generateCoverLetter as generateCoverLetterText } from "../services/coverLetterService.js";

export const generateCoverLetter = async (req, res) => {
  try {
    console.log("Cover letter route hit");
    console.log("Body keys:", Object.keys(req.body || {}));

    const { resumeText, resume, jobDescription, companyName, company, roleTitle, jobTitle } = req.body || {};

    const safeResumeText = (resumeText || resume || "").trim();
    const safeJobDescription = (jobDescription || "").trim();
    const safeCompanyName = (companyName || company || "").trim();
    const safeRoleTitle = (jobTitle || roleTitle || "").trim();

    if (!safeResumeText || !safeJobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeText and jobDescription are required.",
      });
    }

    const coverLetter = await generateCoverLetterText(
      safeResumeText,
      safeJobDescription,
      safeCompanyName,
      safeRoleTitle
    );

    return res.status(200).json({
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
