const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const billingRoutes = require("./routes/billingRoutes");
const jobsRoutes = require("./routes/jobsRoutes");
const indiaAutoHuntRoutes = require("./routes/indiaAutoHuntRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://explain-this-screenshot-ui-otd4.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Developer Career Toolkit API is running - DEPLOY CHECK DRT-INDIA-001");
});

app.get("/api/deploy-check", (req, res) => {
  return res.json({
    success: true,
    marker: "DRT-INDIA-001",
    message: "Latest backend code is live",
    routes: [
      "/api/jobs/test",
      "/api/india-auto-hunt/test",
      "/api/india-auto-hunt/jobs",
    ],
  });
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/resume-tailor", resumeRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/india-auto-hunt", indiaAutoHuntRoutes);

module.exports = app;
