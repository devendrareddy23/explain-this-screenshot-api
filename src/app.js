const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");
const billingRoutes = require("./routes/billingRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/", (req, res) => {
  res.send("AI Screenshot Explainer API is running");
});

app.get("/api/test-billing", (req, res) => {
  res.json({ success: true, message: "Billing routes are connected" });
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/resume-tailor", resumeRoutes);

module.exports = app;
