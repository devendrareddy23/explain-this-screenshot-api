const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://explain-this-screenshot-ui-otd4.vercel.app",
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("AI Screenshot Explainer API is running");
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/resume-tailor", resumeRoutes);

module.exports = app;
