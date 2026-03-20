require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const { startAutoHuntCron } = require("./services/autoHuntCronService");

const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startAutoHuntCron();
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });
