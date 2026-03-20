import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import indiaAutoHuntRoutes from "./routes/indiaAutoHuntRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "India Auto Hunt backend server is running",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API test route working",
  });
});

app.use("/api/india-auto-hunt", indiaAutoHuntRoutes);

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment variables");
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected successfully");
    console.log("India Auto Hunt routes loaded successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
}

startServer();
