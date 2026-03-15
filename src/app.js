const express = require("express");
const cors = require("cors");
const explainRoute = require("./routes/explainRoute");
const screenshotRoutes = require("./routes/screenshotRoutes");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  return res.send("API is running");
});

app.use("/api/explain", explainRoute);
app.use("/api/screenshots", screenshotRoutes);

app.use(errorHandler);

module.exports = app;
