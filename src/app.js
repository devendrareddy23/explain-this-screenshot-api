const cors = require("cors");

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://explain-this-screenshot-jdlfns186.vercel.app",
    ],
    methods: ["GET", "POST"],
  })
);
