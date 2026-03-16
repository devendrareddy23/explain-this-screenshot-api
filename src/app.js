const express = require("express");
const cors = require("cors");

const screenshotRoutes = require("./routes/screenshotRoutes");

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "https://explain-this-screenshot-ui-otd4.vercel.app",
      ];

      const isLocalhost =
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      if (allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
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
