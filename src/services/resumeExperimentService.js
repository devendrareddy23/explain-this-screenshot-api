import Application from "../models/Application.js";
import UserPreference from "../models/UserPreference.js";

const VARIANT_LABELS = {
  A: "Skills-forward",
  B: "Achievement-forward",
  C: "Story-forward",
};

const RESPONSE_STATUSES = new Set(["Viewed", "Interview", "Offer", "Negotiating"]);

export const getResumeVariantAnalytics = async (userId, profileEmail) => {
  const applications = await Application.find({
    ...(userId ? { user: userId } : {}),
    ...(profileEmail ? { profileEmail } : {}),
    resumeVariant: { $in: ["A", "B", "C"] },
  }).sort({ appliedAt: -1 });

  const summary = {
    totalApplications: applications.length,
    winnerDeclared: false,
    winningVariant: "",
    message: "",
    variants: ["A", "B", "C"].map((variantId) => ({
      variantId,
      label: VARIANT_LABELS[variantId],
      appliedCount: 0,
      responseCount: 0,
      responseRate: 0,
    })),
  };

  const byId = Object.fromEntries(summary.variants.map((item) => [item.variantId, item]));

  for (const item of applications) {
    if (!byId[item.resumeVariant]) continue;
    byId[item.resumeVariant].appliedCount += 1;
    if (RESPONSE_STATUSES.has(item.lifecycleStatus)) {
      byId[item.resumeVariant].responseCount += 1;
    }
  }

  for (const item of summary.variants) {
    item.responseRate = item.appliedCount
      ? Number((item.responseCount / item.appliedCount * 100).toFixed(1))
      : 0;
  }

  const eligible = summary.totalApplications >= 20;
  const ranked = [...summary.variants].sort((a, b) => b.responseRate - a.responseRate || b.responseCount - a.responseCount);
  const winner = ranked[0];
  const runnerUp = ranked[1];

  if (eligible && winner?.appliedCount) {
    summary.winnerDeclared = true;
    summary.winningVariant = winner.variantId;
    const multiplier =
      runnerUp?.responseRate && winner.responseRate
        ? Number((winner.responseRate / Math.max(runnerUp.responseRate, 0.1)).toFixed(1))
        : 1;
    summary.message =
      multiplier > 1
        ? `Version ${winner.variantId} is getting ${multiplier}x more responses. Switching all future applications to Version ${winner.variantId}.`
        : `Version ${winner.variantId} is currently your top performer. Switching future applications to Version ${winner.variantId}.`;

    if (userId) {
      await UserPreference.findOneAndUpdate(
        { user: userId },
        {
          user: userId,
          "resumeExperiment.winningVariant": winner.variantId,
          "resumeExperiment.totalEvaluatedApplications": summary.totalApplications,
          "resumeExperiment.lastWinnerDeclaredAt": new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  return summary;
};

export const chooseResumeVariantForJob = ({ variants = [], analytics = null, job = null }) => {
  if (!Array.isArray(variants) || !variants.length) {
    return {
      variantId: "",
      label: "",
      text: "",
      reason: "No resume variants available.",
    };
  }

  if (analytics?.winnerDeclared && analytics?.winningVariant) {
    const winner = variants.find((item) => item.variantId === analytics.winningVariant) || variants[0];
    return {
      ...winner,
      reason: `Winner declared after ${analytics.totalApplications} applications.`,
    };
  }

  const seed = `${job?.title || ""}-${job?.company || ""}`.length;
  const ordered = ["A", "B", "C"];
  const selectedId = ordered[seed % ordered.length];
  const selected = variants.find((item) => item.variantId === selectedId) || variants[0];

  return {
    ...selected,
    reason: "Exploration mode: rotating resume styles until a winner is declared.",
  };
};
