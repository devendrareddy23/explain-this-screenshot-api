import nodemailer from "nodemailer";

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
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
};

const sendEmail = async ({ to, subject, text }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: subject || "India Auto Hunt Update",
    text: text || "India Auto Hunt processed a job."
  });

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

export default sendEmail;
