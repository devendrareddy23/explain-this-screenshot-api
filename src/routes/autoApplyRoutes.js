import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { autoApply, triggerAutoApplyNow } from "../controllers/autoApplyController.js";

const router = express.Router();

const requireAdminTriggerToken = (req, res, next) => {
  const expectedToken = process.env.AUTO_APPLY_ADMIN_TOKEN || process.env.ADMIN_TOKEN || "";
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!expectedToken) {
    return res.status(503).json({
      success: false,
      message: "Admin trigger token is not configured.",
    });
  }

  if (!token || token !== expectedToken) {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Invalid admin token.",
    });
  }

  next();
};

router.post("/me", protect, autoApply);
router.post("/trigger-now", requireAdminTriggerToken, triggerAutoApplyNow);

export default router;
