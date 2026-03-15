const express = require("express");
const router = express.Router();

const { explainImage } = require("../controllers/explainController");
const validateExplainRequest = require("../middlewares/validateExplainRequest");
const asyncHandler = require("../utils/asyncHandler");

router.post("/", validateExplainRequest, asyncHandler(explainImage));

module.exports = router;
