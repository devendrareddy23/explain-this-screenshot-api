import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { indiaAutoHuntRoutes } from "./routes/indiaAutoHuntRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "India Auto Hunt + Jobs backend server is running",
    build: "auto-apply-email-live-v4"
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API test route working",
    build: "auto-apply-email-live-v4"
  });
});

app.get("/api/build-info", (req, res) => {
  res.json({
    success: true,
    build: "auto-apply-email-live-v4",
    routes: [
      "/api/india-auto-hunt/deploy-check",
      "/api/india-auto-hunt/jobs",
      "/api/india-auto-hunt/shortlisted",
      "/api/india-auto-hunt/applied",
      "/api/india-auto-hunt/apply-all",
      "/api/jobs/search",
      "/api/jobs/stored"
    ]
  });
});

app.use("/api/india-auto-hunt", indiaAutoHuntRoutes);
app.use("/api/jobs", jobRoutes);

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || "";

async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
}

startServer();
