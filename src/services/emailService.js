import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

function canSendEmail() {
  return Boolean(SMTP_USER && SMTP_PASS && FROM_EMAIL);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export async function sendAutoAppliedEmail({
  to,
  title,
  company,
  location,
  score,
  redirectUrl,
}) {
  if (!canSendEmail()) {
    console.log("Email skipped: SMTP env vars are missing.");
    return { success: false, skipped: true };
  }

  const transporter = createTransporter();

  const safeTitle = title || "Untitled Job";
  const safeCompany = company || "Unknown Company";
  const safeLocation = location || "Unknown Location";
  const safeScore = Number(score || 0);

  const subject = `Auto Applied: ${safeTitle} at ${safeCompany}`;

  const text = `
Your auto-hunt tool found a matching job and marked it applied in your tracker.

Job Title: ${safeTitle}
Company: ${safeCompany}
Location: ${safeLocation}
Match Score: ${safeScore}/100
Apply Link: ${redirectUrl || "N/A"}

Important:
This means your system auto-processed this job because it matched your threshold.
If the job board still requires a manual submission on their website, open the link above and complete it there.

- Developer Career Toolkit
`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Auto Applied Job Alert</h2>
      <p>Your auto-hunt tool found a matching job and marked it applied in your tracker.</p>
      <p><strong>Job Title:</strong> ${safeTitle}</p>
      <p><strong>Company:</strong> ${safeCompany}</p>
      <p><strong>Location:</strong> ${safeLocation}</p>
      <p><strong>Match Score:</strong> ${safeScore}/100</p>
      <p><strong>Apply Link:</strong> ${
        redirectUrl
          ? `<a href="${redirectUrl}" target="_blank" rel="noopener noreferrer">Open Job</a>`
          : "N/A"
      }</p>
      <p><strong>Important:</strong><br/>
      This means your system auto-processed this job because it matched your threshold.<br/>
      If the job board still requires a manual submission on their website, open the link above and complete it there.</p>
      <p>- Developer Career Toolkit</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });

  return { success: true };
}
