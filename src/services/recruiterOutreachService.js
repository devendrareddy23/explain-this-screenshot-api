import OpenAI from "openai";
import User from "../models/User.js";
import RecruiterOutreach from "../models/RecruiterOutreach.js";
import { sendRecruiterOutreachEmail } from "./emailService.js";
import { extractCompanyDomain, findRecruiterEmail } from "./hunterService.js";
import { buildRecruiterIntelligence } from "./recruiterIntelligenceService.js";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing. Add it to your backend .env file and restart the server.");
  }

  return new OpenAI({ apiKey });
};

const getResumeSummary = (text = "") => {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
};

const buildTrackingPixelUrl = (outreachId) => {
  const baseUrl = process.env.APP_BASE_URL || process.env.API_BASE_URL || process.env.PUBLIC_API_URL || "";

  if (!baseUrl) {
    return "";
  }

  return `${String(baseUrl).replace(/\/$/, "")}/api/outreach/open/${outreachId}.gif`;
};

const generateOutreachEmail = async ({
  candidateName,
  company,
  jobTitle,
  resumeSummary,
  recruiterIntelligence,
  companyIntelligence,
}) => {
  const client = getOpenAIClient();
  const prompt = `You are writing a short recruiter outreach email for a job application.

Candidate: [${candidateName}]
Company: [${company}]
Job title: [${jobTitle}]
Candidate background summary: [${resumeSummary}]

Verified recruiter context:
- Context summary: [${recruiterIntelligence?.verifiedContextSummary || ""}]
- Recent hiring focus: [${Array.isArray(recruiterIntelligence?.recentHiringFocus) ? recruiterIntelligence.recentHiringFocus.join(", ") : ""}]
- Recruiter background status: [${recruiterIntelligence?.careerBackgroundStatus || ""}]
- Recent posts status: [${recruiterIntelligence?.recentPostsStatus || ""}]
- Mutual connections status: [${recruiterIntelligence?.mutualConnectionsStatus || ""}]

Verified company context:
- Tech stack: [${Array.isArray(companyIntelligence?.techStack) ? companyIntelligence.techStack.join(", ") : ""}]
- Growth signal: [${companyIntelligence?.growthSignal || ""}]
- Recommendation reason: [${companyIntelligence?.recommendation?.reason || ""}]

Write a unique, specific email that:
- sounds human and confident
- uses ONLY verified context from above
- never invents LinkedIn posts, mutual connections, recruiter background, or private details
- if recruiter-specific data is unavailable, lean on company/job specifics instead
- does not sound like a template

Return JSON only with:
- subject
- body`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return valid JSON only with subject and body. Keep the email under 170 words, specific, and human. Never fabricate unavailable context.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");

  return {
    subject: String(parsed.subject || `Application for ${jobTitle || "the role"}`).trim(),
    body: String(parsed.body || "").trim(),
  };
};

export const createRecruiterOutreachForJob = async ({ job, userId, profileEmail }) => {
  if (!job?.jobId || !profileEmail || !userId) {
    return null;
  }

  const existing = await RecruiterOutreach.findOne({
    profileEmail,
    jobId: job.jobId,
  });

  if (existing?.status === "sent" || existing?.status === "opened" || existing?.status === "replied") {
    return existing;
  }

  const user = await User.findById(userId).select("name masterResumeText email");

  if (!user) {
    return null;
  }

  const outreach =
    existing ||
    new RecruiterOutreach({
      user: userId,
      profileEmail,
      job: job._id || null,
      jobId: job.jobId,
      company: job.company || "",
    });

  const companyDomain = extractCompanyDomain(job);
  outreach.companyDomain = companyDomain;

  const lookup = await findRecruiterEmail({ companyDomain });

  if (!lookup.success || !lookup.email) {
    outreach.status = "not_found";
    outreach.error = lookup.message || "Recruiter email not found.";
    await outreach.save();
    return outreach;
  }

  const resumeSummary = getResumeSummary(user.masterResumeText);
  const recruiterIntelligence = await buildRecruiterIntelligence({
    job,
    recruiterEmail: lookup.email,
    recruiterName: outreach.recruiterName || "",
  });
  const generated = await generateOutreachEmail({
    candidateName: user.name || profileEmail,
    company: job.company || companyDomain,
    jobTitle: job.title || "the role",
    resumeSummary,
    recruiterIntelligence,
    companyIntelligence: job.companyIntelligence || null,
  });

  outreach.recruiterEmail = lookup.email;
  outreach.recruiterIntelligence = recruiterIntelligence;
  outreach.subject = generated.subject;
  outreach.body = generated.body;

  const trackingPixelUrl = buildTrackingPixelUrl(outreach._id);
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.7; white-space: pre-wrap;">
      ${generated.body}
    </div>
    ${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block" alt="" />` : ""}
  `;

  const sent = await sendRecruiterOutreachEmail({
    to: lookup.email,
    subject: generated.subject,
    text: generated.body,
    html,
  });

  outreach.messageId = sent.messageId || "";
  outreach.sentAt = sent.success ? new Date() : null;
  outreach.status = sent.success ? "sent" : "failed";
  outreach.error = sent.success ? "" : sent.message || "Failed to send outreach email.";
  await outreach.save();

  return outreach;
};
