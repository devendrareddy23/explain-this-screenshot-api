import OpenAI from "openai";

const normalizeText = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const normalizeCompany = (value = "") =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getOpenAIClient = () => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
};

export const getLinkedInConnectionStatus = () => {
  const configured =
    Boolean(String(process.env.LINKEDIN_CLIENT_ID || "").trim()) &&
    Boolean(String(process.env.LINKEDIN_CLIENT_SECRET || "").trim());

  return {
    oauthConfigured: configured,
    connected: false,
    statusMessage: configured
      ? "LinkedIn OAuth credentials exist, but user-level connection sync is not wired yet."
      : "LinkedIn OAuth is not configured in this environment, so HireFlow cannot read social-graph connections automatically.",
  };
};

export const findMatchingConnections = ({ connections = [], company = "" }) => {
  const target = normalizeCompany(company);
  if (!target) return [];

  return connections.filter((connection) => {
    const candidate = normalizeCompany(connection.company);
    return candidate && (candidate.includes(target) || target.includes(candidate));
  });
};

const buildFallbackReferralMessage = ({ connection, job, user }) => {
  return `Hi ${connection?.fullName || "there"},\n\nHope you’re doing well. I saw an opening for ${job?.title || "a role"} at ${job?.company || "your company"} and noticed you’re there. I’ve been working on roles that overlap closely with this kind of work, especially around ${job?.companyIntelligence?.techStack?.slice(0, 3).join(", ") || "the core stack in the posting"}, and I’d love to explore the opportunity seriously.\n\nIf you think it makes sense, would you be open to referring me or sharing any advice on the team and hiring process? I’m happy to send over my resume and a short summary that makes it easy.\n\nThanks a lot,\n${user?.name || user?.email || "Candidate"}`;
};

export const generateReferralRequestMessage = async ({ connection, job, user }) => {
  const fallback = buildFallbackReferralMessage({ connection, job, user });
  const client = getOpenAIClient();

  if (!client) {
    return fallback;
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content:
            "Write only the referral request message. Make it warm, concise, human, and specific. Do not invent private details or closeness the user did not provide.",
        },
        {
          role: "user",
          content: `Write a referral request message.

Candidate:
- Name: ${normalizeText(user?.name || user?.email)}
- Email: ${normalizeText(user?.email)}

Connection:
- Name: ${normalizeText(connection?.fullName)}
- Company: ${normalizeText(connection?.company)}
- Title: ${normalizeText(connection?.title)}
- Relationship: ${normalizeText(connection?.relationship || connection?.notes)}

Target job:
- Company: ${normalizeText(job?.company)}
- Title: ${normalizeText(job?.title)}
- Description: ${normalizeText(job?.description).slice(0, 2200)}
- Match score: ${Number(job?.aiScore10 || 0).toFixed(1)}/10
- Relevant stack: ${(job?.companyIntelligence?.techStack || []).join(", ")}

Rules:
- Keep it under 180 words
- Sound like a real person sending a thoughtful ask
- Make it easy for the connection to say yes
- Do not mention LinkedIn OAuth or automation
- Output only the message text`,
        },
      ],
    });

    return normalizeText(response.choices?.[0]?.message?.content) || fallback;
  } catch (error) {
    console.error("Referral request generation failed, using fallback:", error.message);
    return fallback;
  }
};
