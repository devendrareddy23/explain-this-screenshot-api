const express = require("express");
const multer = require("multer");
const { analyzeScreenshot } = require("../controllers/screenshotController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/", upload.single("screenshot"), analyzeScreenshot);

module.exports = router;
