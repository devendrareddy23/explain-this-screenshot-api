import express from "express";
import { findProducts } from "../controllers/amazonController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/find", protect, findProducts);

export default router;
