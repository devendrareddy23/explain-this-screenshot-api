const express = require("express");
const router = express.Router();

const upload = require("../middlewares/uploadMiddleware");
const { analyzeScreenshot } = require("../controllers/screenshotController");
const asyncHandler = require("../utils/asyncHandler");

router.post(
  "/",
  upload.single("screenshot"),
  asyncHandler(analyzeScreenshot)
);

module.exports = router;
