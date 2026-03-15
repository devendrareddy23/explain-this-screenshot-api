const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://explain-this-screenshot-jdlfns186.vercel.app",
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

module.exports = app;
