import express from "express";
import protect from "../middleware/protect.js";
import {
  getMyApplications,
  getRecentApplications,
  retryApplicationAttempt,
  updateApplicationLifecycle,
} from "../controllers/applicationController.js";
import {
  evaluateInterviewAnswerAttempt,
  getInterviewPrep,
  prepareInterviewPrep,
} from "../controllers/interviewPrepController.js";
import {
  finalizeOfferNegotiationController,
  generateCounterResponseController,
  getOfferNegotiation,
  prepareOfferNegotiationController,
} from "../controllers/offerNegotiationController.js";

const router = express.Router();

router.get("/me", protect, getMyApplications);
router.get("/recent", protect, getRecentApplications);
router.patch("/:id/status", protect, updateApplicationLifecycle);
router.post("/:id/retry", protect, retryApplicationAttempt);
router.get("/:id/interview-prep", protect, getInterviewPrep);
router.post("/:id/interview-prep/prepare", protect, prepareInterviewPrep);
router.post("/:id/interview-prep/evaluate", protect, evaluateInterviewAnswerAttempt);
router.get("/:id/offer-negotiation", protect, getOfferNegotiation);
router.post("/:id/offer-negotiation/prepare", protect, prepareOfferNegotiationController);
router.post("/:id/offer-negotiation/counter", protect, generateCounterResponseController);
router.post("/:id/offer-negotiation/finalize", protect, finalizeOfferNegotiationController);

export default router;
