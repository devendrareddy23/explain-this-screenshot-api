import { sendAutoAppliedEmail } from "./emailService.js";

export const sendApplicationStatusEmail = async ({
  to,
  company,
  role,
  source,
  status,
  appliedAt,
  failureReason = "",
}) => {
  if (!to) {
    return {
      success: false,
      skipped: true,
      message: "Recipient email missing.",
    };
  }

  try {
    const prettyDate = appliedAt
      ? new Date(appliedAt).toLocaleString()
      : new Date().toLocaleString();

    const subject =
      status === "failed"
        ? `HireFlow AI: Application failed for ${role || "a role"}`
        : `HireFlow AI: Application update for ${role || "a role"}`;

    const lines = [
      `Company: ${company || "Unknown company"}`,
      `Role: ${role || "Unknown role"}`,
      `Source: ${source || "Unknown source"}`,
      `Status: ${status || "updated"}`,
      `Date/Time: ${prettyDate}`,
    ];

    if (failureReason) {
      lines.push(`Failure reason: ${failureReason}`);
    }

    return await sendAutoAppliedEmail({
      to,
      subject,
      text: lines.join("\n"),
    });
  } catch (error) {
    return {
      success: false,
      skipped: false,
      message: error.message || "Failed to send application status email.",
    };
  }
};

export const sendCronSummaryEmail = async ({ to, appliedJobs = [], totalFetched = 0 }) => {
  if (!to) {
    return {
      success: false,
      skipped: true,
      message: "Recipient email missing.",
    };
  }

  try {
    const subject = `HireFlow AI: Auto-apply summary (${appliedJobs.length} applied)`;
    const lines = [
      `Total jobs fetched: ${totalFetched}`,
      `Jobs auto-applied: ${appliedJobs.length}`,
      "",
    ];

    if (appliedJobs.length) {
      for (const job of appliedJobs) {
        lines.push(`- ${job.title || "Unknown role"} at ${job.company || "Unknown company"} (${job.source || "Unknown source"})`);
      }
    } else {
      lines.push("No jobs met the auto-apply threshold in this run.");
    }

    return await sendAutoAppliedEmail({
      to,
      subject,
      text: lines.join("\n"),
    });
  } catch (error) {
    return {
      success: false,
      skipped: false,
      message: error.message || "Failed to send cron summary email.",
    };
  }
};

export const sendDailyDigestEmail = async ({
  to,
  appliedCount = 0,
  topCompanies = [],
  matchScoreSummary = "",
}) => {
  if (!to) {
    return {
      success: false,
      skipped: true,
      message: "Recipient email missing.",
    };
  }

  try {
    const lines = [
      "Here's what HireFlow did today",
      "",
      `Jobs applied to: ${appliedCount}`,
      `Top companies applied: ${topCompanies.length ? topCompanies.join(", ") : "None yet"}`,
      `Match scores summary: ${matchScoreSummary || "No scored jobs yet"}`,
    ];

    return await sendAutoAppliedEmail({
      to,
      subject: "Here's what HireFlow did today",
      text: lines.join("\n"),
    });
  } catch (error) {
    return {
      success: false,
      skipped: false,
      message: error.message || "Failed to send daily digest email.",
    };
  }
};

export const sendInstantAlertEmail = async ({ to, subject, lines = [] }) => {
  if (!to) {
    return {
      success: false,
      skipped: true,
      message: "Recipient email missing.",
    };
  }

  try {
    return await sendAutoAppliedEmail({
      to,
      subject,
      text: lines.join("\n"),
    });
  } catch (error) {
    return {
      success: false,
      skipped: false,
      message: error.message || "Failed to send instant alert email.",
    };
  }
};

export const sendWeeklyCareerIntelligenceEmail = async ({
  to,
  weekLabel = "",
  performance = {},
  working = [],
  notWorking = [],
  recommendation = "",
}) => {
  if (!to) {
    return {
      success: false,
      skipped: true,
      message: "Recipient email missing.",
    };
  }

  try {
    const lines = [
      `Your HireFlow Weekly Report${weekLabel ? ` — ${weekLabel}` : ""}`,
      "",
      "Performance:",
      `- ${performance.applicationsSent || 0} applications sent${performance.applicationsDeltaText ? ` (${performance.applicationsDeltaText})` : ""}`,
      `- ${performance.responsesReceived || 0} responses received (${performance.responseRate || 0}% rate${performance.responseRateComparison ? ` — ${performance.responseRateComparison}` : ""})`,
      `- ${performance.interviewsScheduled || 0} interviews scheduled`,
      "",
      "What's Working:",
      ...(working.length ? working.map((item) => `- ${item}`) : ["- No strong weekly pattern yet."]),
      "",
      "What's Not Working:",
      ...(notWorking.length ? notWorking.map((item) => `- ${item}`) : ["- No clear negative signal yet."]),
      "",
      "Recommendation:",
      recommendation || "Keep focusing on the highest-match roles in your queue this week.",
    ];

    return await sendAutoAppliedEmail({
      to,
      subject: `Your HireFlow Weekly Report${weekLabel ? ` — ${weekLabel}` : ""}`,
      text: lines.join("\n"),
    });
  } catch (error) {
    return {
      success: false,
      skipped: false,
      message: error.message || "Failed to send weekly career intelligence email.",
    };
  }
};
