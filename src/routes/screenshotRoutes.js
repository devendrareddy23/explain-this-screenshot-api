const express = require("express");
const multer = require("multer");
const path = require("path");
const { analyzeScreenshot } = require("../controllers/screenshotController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("screenshot"), analyzeScreenshot);

module.exports = router;
