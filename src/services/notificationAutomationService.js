import Application from "../models/Application.js";
import EmailNotificationLog from "../models/EmailNotificationLog.js";
import Job from "../models/Job.js";
import {
  sendDailyDigestEmail,
  sendInstantAlertEmail,
  sendWeeklyCareerIntelligenceEmail,
} from "./applicationNotificationService.js";

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getPlanLimit = (plan) => {
  if (plan === "auto") return Infinity;
  if (plan === "pro") return 100;
  return 5;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const startOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getWeekKey = (date = new Date()) => {
  const target = new Date(date);
  const first = new Date(Date.UTC(target.getFullYear(), 0, 1));
  const diff = (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - first.getTime()) / 86400000;
  const week = Math.ceil((diff + first.getUTCDay() + 1) / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
};

const percentDeltaText = (current = 0, previous = 0) => {
  if (!previous && !current) return "";
  if (!previous) return "new from last week";
  const delta = Math.round((current - previous) / previous * 100);
  if (delta > 0) return `↑${delta}% from last week`;
  if (delta < 0) return `↓${Math.abs(delta)}% from last week`;
  return "flat vs last week";
};

const INDUSTRY_RESPONSE_RATE = 2;
const FAANG_SET = new Set(["google", "meta", "amazon", "apple", "netflix"]);

const average = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
};

const countResponses = (applications = []) =>
  applications.filter((item) => ["Viewed", "Interview", "Offer", "Negotiating"].includes(item.lifecycleStatus)).length;

const isMorningApplication = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  const hour = date.getHours();
  return hour >= 9 && hour < 11;
};

const titleContainsSenior = (title = "") => String(title || "").toLowerCase().includes("senior");

const isFaangCompany = (company = "") => FAANG_SET.has(String(company || "").trim().toLowerCase());

const isJavaRole = (job = {}) => {
  const haystack = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  return haystack.includes(" java ") || haystack.startsWith("java ") || haystack.includes("java,") || haystack.includes("java/");
};

const buildWeeklyRecommendation = ({ scoredJobs = [], recentApplications = [] }) => {
  const highMatches = scoredJobs
    .filter((job) => Number(job.aiScore10 || 0) >= 8)
    .sort((a, b) => Number(b.aiScore10 || 0) - Number(a.aiScore10 || 0));

  if (highMatches.length) {
    const topCompanies = [...new Set(highMatches.map((job) => job.company).filter(Boolean))].slice(0, 3);
    return `Focus on the highest-match roles in your queue this week. Your profile already matches ${highMatches.length} strong roles${topCompanies.length ? `, including opportunities at ${topCompanies.join(", ")}` : ""}.`;
  }

  const seniorResponses = recentApplications.filter((item) => titleContainsSenior(item.title));
  if (seniorResponses.length) {
    return "Lean into senior-title roles this week. Your recent response data shows stronger traction when your target title signals seniority.";
  }

  return "Focus this week on the freshest high-match roles in your queue and keep refining toward the titles that are already generating responses.";
};

const buildWorkingSignals = ({ weekApplications = [], allApplications = [], scoredJobs = [] }) => {
  const working = [];
  const seniorApps = allApplications.filter((item) => titleContainsSenior(item.title));
  const nonSeniorApps = allApplications.filter((item) => !titleContainsSenior(item.title));
  const seniorResponseRate = seniorApps.length ? Math.round(countResponses(seniorApps) / seniorApps.length * 100) : 0;
  const nonSeniorResponseRate = nonSeniorApps.length ? Math.round(countResponses(nonSeniorApps) / nonSeniorApps.length * 100) : 0;

  if (seniorApps.length >= 3 && seniorResponseRate > nonSeniorResponseRate) {
    const ratio = nonSeniorResponseRate ? Math.max(1, Math.round(seniorResponseRate / nonSeniorResponseRate)) : seniorResponseRate ? 3 : 0;
    working.push(`“Senior” in your title is getting ${ratio}x more responses.`);
  }

  const morningApps = allApplications.filter((item) => isMorningApplication(item.appliedAt));
  const nonMorningApps = allApplications.filter((item) => !isMorningApplication(item.appliedAt));
  const morningResponseRate = morningApps.length ? Math.round(countResponses(morningApps) / morningApps.length * 100) : 0;
  const nonMorningResponseRate = nonMorningApps.length ? Math.round(countResponses(nonMorningApps) / nonMorningApps.length * 100) : 0;

  if (morningApps.length >= 3 && morningResponseRate > nonMorningResponseRate) {
    const ratio = nonMorningResponseRate ? Math.max(1, Math.round(morningResponseRate / nonMorningResponseRate)) : morningResponseRate ? 2 : 0;
    working.push(`Morning applications (9-11am) are getting ${ratio}x more views or responses.`);
  }

  const topSourceMap = new Map();
  for (const application of weekApplications) {
    const key = application.source || "Unknown source";
    const bucket = topSourceMap.get(key) || { sent: 0, responded: 0 };
    bucket.sent += 1;
    if (["Viewed", "Interview", "Offer", "Negotiating"].includes(application.lifecycleStatus)) {
      bucket.responded += 1;
    }
    topSourceMap.set(key, bucket);
  }

  const topSource = [...topSourceMap.entries()]
    .filter(([, value]) => value.sent >= 2 && value.responded > 0)
    .sort((a, b) => b[1].responded / b[1].sent - a[1].responded / a[1].sent)[0];

  if (topSource) {
    working.push(`${topSource[0]} is your best-performing source this week.`);
  }

  if (!working.length && scoredJobs.length) {
    const bestRole = scoredJobs.sort((a, b) => Number(b.aiScore10 || 0) - Number(a.aiScore10 || 0))[0];
    if (bestRole?.title) {
      working.push(`Your strongest current match pattern is around roles like ${bestRole.title}.`);
    }
  }

  return working.slice(0, 3);
};

const buildNotWorkingSignals = ({ allApplications = [], scoredJobs = [] }) => {
  const notWorking = [];
  const faangApps = allApplications.filter((item) => isFaangCompany(item.company));
  const faangResponseRate = faangApps.length ? Math.round(countResponses(faangApps) / faangApps.length * 100) : 0;

  if (faangApps.length >= 2 && faangResponseRate === 0) {
    notWorking.push("Applications to FAANG companies are at 0% response right now.");
  }

  const javaJobs = scoredJobs.filter((job) => isJavaRole(job));
  if (javaJobs.length >= 3) {
    const avgJavaScore = average(javaJobs.map((job) => Number(job.aiScore10 || 0)));
    if (avgJavaScore < 6) {
      notWorking.push("Roles requiring Java are generating low match scores.");
    }
  }

  const lowScoreJobs = scoredJobs.filter((job) => Number(job.aiScore10 || 0) < 5).length;
  if (!notWorking.length && lowScoreJobs >= 5) {
    notWorking.push("A large share of fresh roles are still landing below the quality threshold, so tighten targeting this week.");
  }

  return notWorking.slice(0, 3);
};

const canSendNotification = async ({ userId, profileEmail, type, dedupeKey, meta = null }) => {
  try {
    await EmailNotificationLog.create({
      user: userId,
      profileEmail,
      type,
      dedupeKey,
      sentAt: new Date(),
      meta,
    });
    return true;
  } catch {
    return false;
  }
};

export const sendDailyDigestIfNeeded = async ({ user }) => {
  const todayKey = getDateKey();
  const canSend = await canSendNotification({
    userId: user._id,
    profileEmail: user.email,
    type: "daily_digest",
    dedupeKey: todayKey,
  });

  if (!canSend) {
    return { success: true, skipped: true, message: "Daily digest already sent today." };
  }

  const today = startOfToday();
  const applications = await Application.find({
    profileEmail: user.email,
    appliedAt: { $gte: today },
  }).sort({ appliedAt: -1 });

  const scoredJobs = await Job.find({
    profileEmail: user.email,
    createdAt: { $gte: today },
  }).sort({ createdAt: -1 });

  const companyCounts = new Map();
  for (const app of applications) {
    const key = app.company || "Unknown company";
    companyCounts.set(key, (companyCounts.get(key) || 0) + 1);
  }

  const topCompanies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const strong = scoredJobs.filter((job) => Number(job.aiScore10 || 0) >= 8).length;
  const good = scoredJobs.filter((job) => Number(job.aiScore10 || 0) >= 5 && Number(job.aiScore10 || 0) < 8).length;
  const weak = scoredJobs.filter((job) => Number(job.aiScore10 || 0) < 5).length;

  return sendDailyDigestEmail({
    to: user.email,
    appliedCount: applications.length,
    topCompanies,
    matchScoreSummary: `${strong} strong, ${good} good, ${weak} weak`,
  });
};

export const sendPerfectMatchAlerts = async ({ user, jobs = [] }) => {
  const perfectJobs = jobs.filter((job) => Number(job.aiScore10 || 0) === 10);

  for (const job of perfectJobs) {
    const canSend = await canSendNotification({
      userId: user._id,
      profileEmail: user.email,
      type: "perfect_match",
      dedupeKey: String(job.jobId || job._id),
      meta: { score: job.aiScore10 },
    });

    if (!canSend) continue;

    await sendInstantAlertEmail({
      to: user.email,
      subject: `Perfect 10/10 match: ${job.title || "New role"}`,
      lines: [
        "A new job matched perfectly with your profile.",
        `Role: ${job.title || "Unknown role"}`,
        `Company: ${job.company || "Unknown company"}`,
        `Score: ${job.aiScore10}/10`,
      ],
    });
  }
};

export const sendNearLimitAlertIfNeeded = async ({ user }) => {
  const limit = getPlanLimit(user.plan);

  if (!Number.isFinite(limit)) {
    return { success: true, skipped: true, message: "Unlimited plan." };
  }

  const used = await Application.countDocuments({ profileEmail: user.email });
  const ratio = used / Math.max(limit, 1);

  if (ratio < 0.8) {
    return { success: true, skipped: true, message: "Usage not near limit." };
  }

  const canSend = await canSendNotification({
    userId: user._id,
    profileEmail: user.email,
    type: "usage_near_limit",
    dedupeKey: getDateKey(),
    meta: { used, limit },
  });

  if (!canSend) {
    return { success: true, skipped: true, message: "Near-limit alert already sent today." };
  }

  return sendInstantAlertEmail({
    to: user.email,
    subject: "HireFlow AI: You’re close to your application limit",
    lines: [
      `You’ve used ${used} of ${limit} applications.`,
      "Upgrade or review your queue to keep momentum going.",
    ],
  });
};

export const sendWeeklyCareerIntelligenceIfNeeded = async ({ user }) => {
  const weekKey = getWeekKey();
  const canSend = await canSendNotification({
    userId: user._id,
    profileEmail: user.email,
    type: "weekly_career_report",
    dedupeKey: weekKey,
  });

  if (!canSend) {
    return { success: true, skipped: true, message: "Weekly career report already sent this week." };
  }

  const today = startOfDay(new Date());
  const currentWeekStart = addDays(today, -7);
  const previousWeekStart = addDays(today, -14);

  const [currentWeekApplications, previousWeekApplications, recentApplications, scoredJobs] = await Promise.all([
    Application.find({
      profileEmail: user.email,
      appliedAt: { $gte: currentWeekStart, $lt: today },
    }).sort({ appliedAt: -1 }),
    Application.find({
      profileEmail: user.email,
      appliedAt: { $gte: previousWeekStart, $lt: currentWeekStart },
    }).sort({ appliedAt: -1 }),
    Application.find({
      profileEmail: user.email,
      appliedAt: { $gte: addDays(today, -45) },
    }).sort({ appliedAt: -1 }),
    Job.find({
      profileEmail: user.email,
      createdAt: { $gte: addDays(today, -14) },
    }).sort({ createdAt: -1 }),
  ]);

  const currentResponses = countResponses(currentWeekApplications);
  const currentResponseRate = currentWeekApplications.length
    ? Math.round(currentResponses / currentWeekApplications.length * 100)
    : 0;
  const performance = {
    applicationsSent: currentWeekApplications.length,
    applicationsDeltaText: percentDeltaText(currentWeekApplications.length, previousWeekApplications.length),
    responsesReceived: currentResponses,
    responseRate: currentResponseRate,
    responseRateComparison:
      currentResponseRate > INDUSTRY_RESPONSE_RATE
        ? `${Math.max(1, Math.round(currentResponseRate / INDUSTRY_RESPONSE_RATE))}x industry avg`
        : `industry avg: ${INDUSTRY_RESPONSE_RATE}%`,
    interviewsScheduled: currentWeekApplications.filter((item) => item.lifecycleStatus === "Interview").length,
  };

  const working = buildWorkingSignals({
    weekApplications: currentWeekApplications,
    allApplications: recentApplications,
    scoredJobs,
  });
  const notWorking = buildNotWorkingSignals({
    allApplications: recentApplications,
    scoredJobs,
  });
  const recommendation = buildWeeklyRecommendation({
    scoredJobs,
    recentApplications,
  });

  return sendWeeklyCareerIntelligenceEmail({
    to: user.email,
    weekLabel: weekKey.replace("-", " "),
    performance,
    working,
    notWorking,
    recommendation,
  });
};
