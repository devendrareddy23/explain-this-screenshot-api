import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { errorText = "" } = req.body || {};

    if (!errorText) {
      return res.status(400).json({
        success: false,
        message: "errorText is required.",
      });
    }

    const result = `
Stack:
General JavaScript / backend / frontend runtime

Problem:
The provided error needs analysis.

Quick Fix:
- Read the exact error carefully.
- Check the file and line where it occurs.
- Verify null/undefined values before using them.
- Confirm imports/exports and route wiring.

Explanation:
This endpoint is currently in safe placeholder mode while we focus the product on jobs, resume tailoring, cover letters, and auto-apply.

Commands to Run:
- npm run dev
- npm run build
- check server logs
- verify request payload

Step-by-Step Fix:
1. Identify where the error is thrown.
2. Confirm the input data is valid.
3. Confirm backend route and frontend request match.
4. Fix the root cause and retest.
`.trim();

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("POST /api/screenshots error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze screenshot.",
      error: error.message,
    });
  }
});

export { router as screenshotRoutes };
export default router;
