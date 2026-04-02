import mongoose from "mongoose";
import Application from "../models/Application.js";
import InterviewPrep from "../models/InterviewPrep.js";
import Job from "../models/Job.js";
import RecruiterOutreach from "../models/RecruiterOutreach.js";
import User from "../models/User.js";
import UserPreference from "../models/UserPreference.js";
import { buildCompanyIntelligence } from "../services/companyIntelligenceService.js";
import { evaluateInterviewAnswer, generateInterviewPrep } from "../services/interviewPrepService.js";

const loadApplicationBundle = async (req, applicationId) => {
  const application = await Application.findOne({
    _id: applicationId,
    profileEmail: req.user.email,
  });

  if (!application) {
    return { error: { status: 404, message: "Application not found." } };
  }

  const job = await Job.findOne({
    _id: application.job,
    profileEmail: req.user.email,
  });

  if (!job) {
    return { error: { status: 404, message: "Job not found for this application." } };
  }

  return { application, job };
};

const ensureCompanyIntelligence = async (job) => {
  if (job?.companyIntelligence?.recommendation?.label) {
    return job.companyIntelligence;
  }

  const outreach = await RecruiterOutreach.findOne({ jobId: job.jobId }).sort({ createdAt: -1 });
  const intelligence = await buildCompanyIntelligence({ job, outreach });
  job.companyIntelligence = intelligence;
  await job.save();
  return intelligence;
};

export const getInterviewPrep = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const prep = await InterviewPrep.findOne({
      application: id,
      profileEmail: req.user.email,
    }).sort({ updatedAt: -1 });

    if (!prep) {
      return res.status(404).json({
        success: false,
        message: "Interview prep not found yet.",
      });
    }

    return res.status(200).json({
      success: true,
      interviewPrep: prep,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load interview prep.",
      error: error.message,
    });
  }
};

export const prepareInterviewPrep = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false, interviewScheduledAt = null } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const bundle = await loadApplicationBundle(req, id);
    if (bundle.error) {
      return res.status(bundle.error.status).json({
        success: false,
        message: bundle.error.message,
      });
    }

    const { application, job } = bundle;

    if (application.lifecycleStatus !== "Interview") {
      return res.status(400).json({
        success: false,
        message: "Interview prep becomes available when the application is in Interview status.",
      });
    }

    let existing = await InterviewPrep.findOne({
      application: application._id,
      profileEmail: req.user.email,
    });

    if (existing && !force) {
      if (interviewScheduledAt) {
        existing.interviewScheduledAt = new Date(interviewScheduledAt);
        await existing.save();
      }

      return res.status(200).json({
        success: true,
        message: "Interview prep ready.",
        interviewPrep: existing,
      });
    }

    const [companyIntelligence, preference, user] = await Promise.all([
      ensureCompanyIntelligence(job),
      UserPreference.findOne({ user: req.user._id }),
      User.findById(req.user._id).select("masterResumeText name email"),
    ]);

    const prepPayload = await generateInterviewPrep({
      application,
      job,
      companyIntelligence,
      careerDna: preference?.careerDna || null,
      resumeText: user?.masterResumeText || "",
      interviewScheduledAt,
    });

    existing = await InterviewPrep.findOneAndUpdate(
      {
        application: application._id,
        profileEmail: req.user.email,
      },
      {
        user: req.user._id,
        profileEmail: req.user.email,
        application: application._id,
        job: job._id,
        title: prepPayload.title,
        company: prepPayload.company,
        interviewScheduledAt: interviewScheduledAt ? new Date(interviewScheduledAt) : null,
        jobDescription: prepPayload.jobDescription,
        companySnapshot: prepPayload.companySnapshot,
        likelyQuestions: prepPayload.likelyQuestions,
        preInterviewBrief: prepPayload.preInterviewBrief,
        generatedAt: prepPayload.generatedAt || new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Interview prep generated.",
      interviewPrep: existing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate interview prep.",
      error: error.message,
    });
  }
};

export const evaluateInterviewAnswerAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, mode = "text" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    if (!String(question || "").trim() || !String(answer || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "question and answer are required.",
      });
    }

    const bundle = await loadApplicationBundle(req, id);
    if (bundle.error) {
      return res.status(bundle.error.status).json({
        success: false,
        message: bundle.error.message,
      });
    }

    const { job } = bundle;

    const prep = await InterviewPrep.findOne({
      application: id,
      profileEmail: req.user.email,
    });

    if (!prep) {
      return res.status(404).json({
        success: false,
        message: "Interview prep not found. Generate prep first.",
      });
    }

    const feedback = await evaluateInterviewAnswer({
      question: String(question),
      answer: String(answer),
      job,
      prep,
    });

    const attempt = {
      question: String(question).trim(),
      answer: String(answer).trim(),
      mode: mode === "voice" ? "voice" : "text",
      feedback,
      createdAt: new Date(),
    };

    prep.practiceHistory = [...(prep.practiceHistory || []), attempt].slice(-24);
    prep.lastEvaluatedAt = new Date();
    await prep.save();

    return res.status(200).json({
      success: true,
      message: "Interview feedback ready.",
      feedback,
      interviewPrep: prep,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to evaluate interview answer.",
      error: error.message,
    });
  }
};
