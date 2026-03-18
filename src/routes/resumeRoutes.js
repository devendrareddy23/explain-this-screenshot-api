const express = require("express");
const { tailorResume } = require("../controllers/resumeController");

const router = express.Router();

router.post("/", tailorResume);

module.exports = router;
