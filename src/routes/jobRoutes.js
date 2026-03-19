const express = require("express");
const { searchJobsController } = require("../controllers/jobController");

const router = express.Router();

router.post("/search", searchJobsController);

module.exports = router;
