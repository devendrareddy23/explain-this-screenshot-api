const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");
const billingRoutes = require("./routes/billingRoutes");

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

app.get("/api/test-billing", (req, res) => {
  res.json({ success: true, message: "Billing routes are connected" });
});

app.use("/api/screenshots", screenshotRoutes);
app.use("/api/billing", billingRoutes);

module.exports = app;
