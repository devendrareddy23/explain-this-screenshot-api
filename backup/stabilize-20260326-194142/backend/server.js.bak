import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/authRoutes.js";
import screenshotRoutes from "./routes/screenshotRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import coverLetterRoutes from "./routes/coverLetterRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import jobsRoutes from "./routes/jobsRoutes.js";
import autoApplyRoutes from "./routes/autoApplyRoutes.js";
import resumeTailorRoutes from "./routes/resumeTailorRoutes.js";
import { startAutoApplyCron } from "./services/autoApplyService.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HireFlow AI API is running"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/screenshots", screenshotRoutes);
app.use("/api/resume-tailor", resumeTailorRoutes);
app.use("/api/cover-letter", coverLetterRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/auto-apply", autoApplyRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error."
  });
});

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startAutoApplyCron();
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
};

startServer();
