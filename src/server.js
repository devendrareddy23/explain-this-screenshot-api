const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

function normalizeRouter(mod) {
  if (!mod) return null;
  if (typeof mod === "function") return mod;
  if (typeof mod.default === "function") return mod.default;
  if (typeof mod.router === "function") return mod.router;
  if (typeof mod.routes === "function") return mod.routes;
  if (typeof mod.jobsRoutes === "function") return mod.jobsRoutes;
  if (typeof mod.indiaAutoHuntRoutes === "function") return mod.indiaAutoHuntRoutes;
  if (typeof mod.screenshotRoutes === "function") return mod.screenshotRoutes;
  if (typeof mod.resumeRoutes === "function") return mod.resumeRoutes;
  return null;
}

function loadRoute(modulePath, label) {
  try {
    const mod = require(modulePath);
    const router = normalizeRouter(mod);

    if (!router) {
      console.error(`❌ ${label} did not export a valid Express router.`);
      console.error(`   Module path: ${modulePath}`);
      console.error(`   Export keys:`, mod && typeof mod === "object" ? Object.keys(mod) : typeof mod);
      return express.Router();
    }

    console.log(`✅ Loaded ${label}`);
    return router;
  } catch (error) {
    console.error(`❌ Failed to load ${label}`);
    console.error(`   Module path: ${modulePath}`);
    console.error(`   Error: ${error.message}`);
    return express.Router();
  }
}

const screenshotRoutes = loadRoute("./routes/screenshotRoutes", "screenshotRoutes");
const resumeRoutes = loadRoute("./routes/resumeRoutes", "resumeRoutes");
const jobsRoutes = loadRoute("./routes/jobsRoutes", "jobsRoutes");
const indiaAutoHuntRoutes = loadRoute("./routes/indiaAutoHuntRoutes", "indiaAutoHuntRoutes");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API test route working",
    build: "route-debug-v1",
  });
});

app.get("/api/build-info", (req, res) => {
  res.json({
    success: true,
    build: "route-debug-v1",
    routes: [
      "/api/test",
      "/api/build-info",
      "/api/screenshots",
      "/api/resume-tailor",
      "/api/jobs/search",
      "/api/jobs/profile",
      "/api/jobs/stored",
      "/api/india-auto-hunt/deploy-check",
      "/api/india-auto-hunt/jobs",
      "/api/india-auto-hunt/shortlisted",
      "/api/india-auto-hunt/applied",
      "/api/india-auto-hunt/apply-all",
      "/api/india-auto-hunt/job-action"
    ],
  });
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/resume-tailor", resumeRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/india-auto-hunt", indiaAutoHuntRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
