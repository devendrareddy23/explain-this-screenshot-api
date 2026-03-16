const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");

const app = express();

app.use(
  cors({
    origin: true,
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
