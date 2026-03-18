const express = require("express");
const { tailorResumeController } = require("../controllers/resumeController");

const router = express.Router();

router.post("/", tailorResumeController);

module.exports = router;
