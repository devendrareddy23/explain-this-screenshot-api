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
  res.send("Developer Career Toolkit API is running");
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/resume-tailor", resumeRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/india-auto-hunt", indiaAutoHuntRoutes);

module.exports = app;
