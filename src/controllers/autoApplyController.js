import Job from "../models/Job.js";
import User from "../models/User.js";
import { tailorResume } from "../services/resumeService.js";
import { generateCoverLetter } from "../services/coverLetterService.js";

export const autoApply = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    const rawUser = await User.collection.findOne({ _id: req.user._id });

    if (!rawUser) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (rawUser.plan !== "pro") {
      return res.status(403).json({
        success: false,
        message: "Upgrade to Pro to enable auto apply.",
      });
    }

    const resumeText = rawUser.savedResumeText || rawUser.resumeText || "";

    console.log("AUTO APPLY DEBUG email:", rawUser.email);
    console.log("AUTO APPLY DEBUG savedResumeText exists:", !!rawUser.savedResumeText);
    console.log("AUTO APPLY DEBUG resumeText exists:", !!rawUser.resumeText);
    console.log("AUTO APPLY DEBUG final resume length:", resumeText.length);

    if (!resumeText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Resume not found. Save resume first.",
      });
    }

    const jobs = await Job.find({
      profileEmail: rawUser.email,
      applied: false,
      skipped: { $ne: true },
    }).sort({ createdAt: -1 });

    if (!jobs.length) {
      return res.json({
        success: true,
        message: "No jobs available to auto apply.",
        appliedCount: 0,
        jobs: [],
      });
    }

    const appliedJobs = [];

    for (const job of jobs) {
      const jobDescription = job.description || "";

      const tailoredResume = await tailorResume(resumeText, jobDescription);
      const coverLetter = await generateCoverLetter(resumeText, jobDescription);

      job.tailoredResume = tailoredResume;
      job.coverLetter = coverLetter;
      job.applied = true;
      job.appliedAt = new Date();
      job.notes = "Auto applied via HireFlow AI Pro";

      await job.save();

      appliedJobs.push({
        id: job._id,
        company: job.company,
        title: job.title,
        location: job.location,
        appliedAt: job.appliedAt,
      });
    }

    return res.json({
      success: true,
      message: `Auto applied to ${appliedJobs.length} jobs.`,
      appliedCount: appliedJobs.length,
      jobs: appliedJobs,
    });
  } catch (error) {
    console.error("AUTO APPLY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Auto apply failed.",
    });
  }
};
