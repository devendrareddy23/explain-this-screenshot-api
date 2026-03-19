const express = require("express");
const { explainScreenshot } = require("../controllers/screenshotController");

const router = express.Router();

router.post("/", explainScreenshot);

module.exports = router;
