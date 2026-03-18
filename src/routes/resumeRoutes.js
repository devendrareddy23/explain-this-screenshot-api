const express = require("express");
const { handleResumeTailor } = require("../controllers/resumeController");

const router = express.Router();

router.post("/", handleResumeTailor);

module.exports = router;
