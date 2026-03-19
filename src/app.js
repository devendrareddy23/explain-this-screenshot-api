const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");
const billingRoutes = require("./routes/billingRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5182",
      "https://explain-this-screenshot-ui-otd4.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Developer Career Toolkit API is running");
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/resume-tailor", resumeRoutes);

module.exports = app;
