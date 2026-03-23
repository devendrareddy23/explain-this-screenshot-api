import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import coverLetterRoutes from "./routes/coverLetterRoutes.js";
import screenshotRoutes from "./routes/screenshotRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";

const app = express();

connectDB();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API test route working",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/resume-tailor", resumeRoutes);
app.use("/api/cover-letter", coverLetterRoutes);
app.use("/api/screenshots", screenshotRoutes);
app.use("/api/usage", usageRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
    error: error.message,
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
