const express = require("express");
const multer = require("multer");
const { explainScreenshot } = require("../controllers/screenshotController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/", upload.single("screenshot"), explainScreenshot);

module.exports = router;
