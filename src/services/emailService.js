import nodemailer from "nodemailer";
import { EMAIL_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER or EMAIL_PASS is missing in environment variables");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS
  });
};

const sendEmail = async ({ to, subject, text, html = "" }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = createTransporter();

  const info = await withServiceTimeout(
    () =>
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: subject || "India Auto Hunt Update",
        text: text || "India Auto Hunt processed a job.",
        ...(html ? { html } : {}),
      }),
    EMAIL_TIMEOUT_MS,
    "Email delivery timed out."
  );

  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || []
  };
};

export const sendJobApplicationEmail = async ({ to, subject, text }) => {
  return sendEmail({
    to,
    subject: subject || "Auto Apply Ready",
    text: text || "A job application email was prepared."
  });
};

export const sendAutoAppliedEmail = async ({ to, subject, text }) => {
  return sendEmail({
    to,
    subject: subject || "Job Auto-Applied Successfully",
    text: text || "A job was auto-applied successfully."
  });
};

export const sendRecruiterOutreachEmail = async ({ to, subject, text, html }) => {
  return sendEmail({
    to,
    subject: subject || "Application outreach",
    text: text || "",
    html,
  });
};

export default sendEmail;
