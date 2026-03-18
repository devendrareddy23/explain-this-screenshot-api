const asyncHandler = require("../utils/asyncHandler");
const { tailorResume } = require("../services/resumeService");

const tailorResumeController = asyncHandler(async (req, res) => {
  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({
      success: false,
      message: "Resume text and job description are required.",
    });
  }

  const result = await tailorResume({ resumeText, jobDescription });

  res.status(200).json({
    success: true,
    result,
  });
});

module.exports = {
  tailorResumeController,
};
