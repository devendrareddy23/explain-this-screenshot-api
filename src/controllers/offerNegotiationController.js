import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import OfferNegotiation from "../models/OfferNegotiation.js";
import UserPreference from "../models/UserPreference.js";
import RecruiterOutreach from "../models/RecruiterOutreach.js";
import { buildCompanyIntelligence } from "../services/companyIntelligenceService.js";
import {
  prepareCounterResponse,
  prepareOfferNegotiation,
  summarizeNegotiationWin,
} from "../services/offerNegotiationService.js";

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

export const getOfferNegotiation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const negotiation = await OfferNegotiation.findOne({
      application: id,
      profileEmail: req.user.email,
    }).sort({ updatedAt: -1 });

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Offer strategy not found yet.",
      });
    }

    return res.status(200).json({
      success: true,
      offerNegotiation: negotiation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load offer strategy.",
      error: error.message,
    });
  }
};

export const prepareOfferNegotiationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { offerAmount, currency = "", force = false } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const numericOfferAmount = Number(offerAmount || 0);
    if (!Number.isFinite(numericOfferAmount) || numericOfferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid offer amount is required.",
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
    if (!["Offer", "Negotiating"].includes(application.lifecycleStatus)) {
      return res.status(400).json({
        success: false,
        message: "Offer strategy becomes available when the application is in Offer or Negotiating status.",
      });
    }

    let existing = await OfferNegotiation.findOne({
      application: application._id,
      profileEmail: req.user.email,
    });

    if (existing && !force && existing.initialOfferAmount) {
      existing.currentOfferAmount = numericOfferAmount;
      existing.currency = currency || existing.currency;
      await existing.save();

      return res.status(200).json({
        success: true,
        message: "Offer strategy ready.",
        offerNegotiation: existing,
      });
    }

    const [companyIntelligence, preference] = await Promise.all([
      ensureCompanyIntelligence(job),
      UserPreference.findOne({ user: req.user._id }),
    ]);

    const prepared = await prepareOfferNegotiation({
      application,
      job,
      companyIntelligence,
      expectedSalaryMin: preference?.expectedSalaryMin || null,
      careerDna: preference?.careerDna || null,
      offerAmount: numericOfferAmount,
      currency,
    });

    existing = await OfferNegotiation.findOneAndUpdate(
      {
        application: application._id,
        profileEmail: req.user.email,
      },
      {
        user: req.user._id,
        profileEmail: req.user.email,
        application: application._id,
        job: job._id,
        title: application.title || job.title || "",
        company: application.company || job.company || "",
        currency: prepared.marketBenchmark?.currency || currency || job.salaryCurrency || "INR",
        initialOfferAmount: existing?.initialOfferAmount || numericOfferAmount,
        currentOfferAmount: numericOfferAmount,
        marketBenchmark: prepared.marketBenchmark,
        negotiationScript: prepared.negotiationScript,
        generatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Offer strategy generated.",
      offerNegotiation: existing,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to prepare offer strategy.",
      error: error.message,
    });
  }
};

export const generateCounterResponseController = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentOfferAmount, candidateGoal = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const negotiation = await OfferNegotiation.findOne({
      application: id,
      profileEmail: req.user.email,
    });

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Offer strategy not found. Prepare the offer strategy first.",
      });
    }

    const numericCurrent = Number(currentOfferAmount || 0);
    if (!Number.isFinite(numericCurrent) || numericCurrent <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid counter offer amount is required.",
      });
    }

    const bundle = await loadApplicationBundle(req, id);
    if (bundle.error) {
      return res.status(bundle.error.status).json({
        success: false,
        message: bundle.error.message,
      });
    }

    const counterResponseScript = await prepareCounterResponse({
      application: bundle.application,
      benchmark: negotiation.marketBenchmark || {},
      currentOfferAmount: numericCurrent,
      candidateGoal,
    });

    negotiation.currentOfferAmount = numericCurrent;
    negotiation.counterResponseScript = counterResponseScript;
    await negotiation.save();

    return res.status(200).json({
      success: true,
      message: "Counter strategy ready.",
      offerNegotiation: negotiation,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate counter response.",
      error: error.message,
    });
  }
};

export const finalizeOfferNegotiationController = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalOfferAmount } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application id.",
      });
    }

    const negotiation = await OfferNegotiation.findOne({
      application: id,
      profileEmail: req.user.email,
    });

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        message: "Offer strategy not found. Prepare the offer strategy first.",
      });
    }

    const numericFinal = Number(finalOfferAmount || 0);
    if (!Number.isFinite(numericFinal) || numericFinal <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid final offer amount is required.",
      });
    }

    const summary = summarizeNegotiationWin({
      initialOfferAmount: negotiation.initialOfferAmount,
      finalOfferAmount: numericFinal,
      currency: negotiation.currency || negotiation.marketBenchmark?.currency || "INR",
    });

    negotiation.finalOfferAmount = numericFinal;
    negotiation.currentOfferAmount = numericFinal;
    negotiation.upliftAmount = summary.upliftAmount;
    negotiation.finalizedAt = new Date();
    await negotiation.save();

    return res.status(200).json({
      success: true,
      message: summary.summary,
      offerNegotiation: negotiation,
      upliftSummary: summary.summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to finalize offer negotiation.",
      error: error.message,
    });
  }
};
