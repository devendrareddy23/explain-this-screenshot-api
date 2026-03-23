import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Resume route working.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Resume route failed.",
      error: error.message,
    });
  }
});

export default router;
