const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const jobRoutes = require("./routes/jobRoutes");
const indiaAutoHuntRoutes = require("./routes/indiaAutoHuntRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/resume-tailor", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/india-auto-hunt", indiaAutoHuntRoutes);

module.exports = app;
