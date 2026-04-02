import { ensureReferralCode, getReferralStats } from "../services/referralService.js";

export const getMyReferralStats = async (req, res) => {
  try {
    await ensureReferralCode(req.user);
    const stats = await getReferralStats(req.user._id);
    const appBaseUrl = String(process.env.APP_URL || process.env.FRONTEND_URL || req.headers.origin || "").replace(/\/$/, "");
    const referralPath = stats.referralCode ? `/?ref=${encodeURIComponent(stats.referralCode)}` : "";

    return res.status(200).json({
      success: true,
      stats: {
        ...stats,
        referralLink: referralPath ? `${appBaseUrl}${referralPath}` : "",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load referral stats.",
      error: error.message,
    });
  }
};
