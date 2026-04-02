import mongoose from "mongoose";
import Job from "../models/Job.js";
import ReferralAssist from "../models/ReferralAssist.js";
import UserConnection from "../models/UserConnection.js";
import { findMatchingConnections, generateReferralRequestMessage, getLinkedInConnectionStatus } from "../services/referralAssistService.js";

const sanitizeConnection = (item = {}) => ({
  source: ["linkedin", "manual"].includes(String(item.source || "").toLowerCase())
    ? String(item.source || "").toLowerCase()
    : "manual",
  fullName: String(item.fullName || "").trim(),
  company: String(item.company || "").trim(),
  title: String(item.title || "").trim(),
  relationship: String(item.relationship || "").trim(),
  linkedinUrl: String(item.linkedinUrl || "").trim(),
  email: String(item.email || "").trim().toLowerCase(),
  notes: String(item.notes || "").trim(),
});

export const getMyConnections = async (req, res) => {
  try {
    const items = await UserConnection.find({ user: req.user._id }).sort({ company: 1, fullName: 1 });
    return res.status(200).json({
      success: true,
      linkedin: getLinkedInConnectionStatus(),
      items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load connections.",
      error: error.message,
    });
  }
};

export const saveMyConnections = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.map((item) => sanitizeConnection(item)).filter((item) => item.fullName && item.company) : [];

    await UserConnection.deleteMany({ user: req.user._id });

    if (items.length) {
      await UserConnection.insertMany(
        items.map((item) => ({
          user: req.user._id,
          profileEmail: req.user.email,
          ...item,
        }))
      );
    }

    const saved = await UserConnection.find({ user: req.user._id }).sort({ company: 1, fullName: 1 });

    return res.status(200).json({
      success: true,
      message: "Connections saved.",
      linkedin: getLinkedInConnectionStatus(),
      items: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save connections.",
      error: error.message,
    });
  }
};

export const getReferralAssistForJob = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const [connections, existing] = await Promise.all([
      UserConnection.find({ user: req.user._id }),
      ReferralAssist.findOne({ user: req.user._id, job: id }),
    ]);

    const matches = findMatchingConnections({
      connections,
      company: job.company,
    });

    return res.status(200).json({
      success: true,
      linkedin: getLinkedInConnectionStatus(),
      matches,
      referralAssist: existing,
      referralLiftLabel: "Employee referrals typically outperform cold applications.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load referral assist.",
      error: error.message,
    });
  }
};

export const generateReferralAssistForJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { connectionId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id.",
      });
    }

    const job = await Job.findOne({
      _id: id,
      profileEmail: req.user.email,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const connections = await UserConnection.find({ user: req.user._id });
    const matches = findMatchingConnections({ connections, company: job.company });
    const selectedConnection =
      matches.find((item) => String(item._id) === String(connectionId || "")) || matches[0] || null;

    if (!selectedConnection) {
      return res.status(404).json({
        success: false,
        message: "No matching connection found for this company yet.",
      });
    }

    const referralMessage = await generateReferralRequestMessage({
      connection: selectedConnection,
      job,
      user: req.user,
    });

    const linkedinStatus = getLinkedInConnectionStatus();
    const assist = await ReferralAssist.findOneAndUpdate(
      {
        user: req.user._id,
        job: job._id,
      },
      {
        user: req.user._id,
        profileEmail: req.user.email,
        job: job._id,
        connection: selectedConnection._id,
        company: job.company,
        title: job.title,
        matchedConnectionName: selectedConnection.fullName,
        matchedConnectionCompany: selectedConnection.company,
        connectionSource: selectedConnection.source,
        linkedinOauthConfigured: linkedinStatus.oauthConfigured,
        linkedinConnected: linkedinStatus.connected,
        referralMessage,
        referredApplicationsLiftLabel: "Employee referrals typically outperform cold applications.",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Referral request generated.",
      linkedin: linkedinStatus,
      matches,
      referralAssist: assist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate referral assist.",
      error: error.message,
    });
  }
};
