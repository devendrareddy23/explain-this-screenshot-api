import { findAmazonProducts } from "../services/amazonService.js";
import {
  getAmazonUsageStatus,
  consumeAmazonUsage,
} from "../services/amazonUsageService.js";

export const findProducts = async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login first.",
        products: [],
      });
    }

    if (!keyword || !keyword.trim()) {
      return res.status(400).json({
        success: false,
        message: "Keyword is required",
        products: [],
      });
    }

    const userId = req.user._id || req.user.id;
    const isProUser = req.user.plan === "pro";

    const usageBefore = await getAmazonUsageStatus({
      userId,
      isProUser,
    });

    if (!usageBefore.hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Free daily limit reached. Upgrade to Pro for unlimited Amazon product research.",
        products: [],
        usage: usageBefore,
      });
    }

    const result = await findAmazonProducts(keyword.trim());

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || "Failed to find Amazon products",
        products: result.products || [],
        raw: result.raw || null,
        usage: usageBefore,
      });
    }

    const usageAfter = await consumeAmazonUsage({
      userId,
      isProUser,
    });

    return res.status(200).json({
      success: true,
      products: Array.isArray(result.products) ? result.products : [],
      usage: usageAfter,
    });
  } catch (error) {
    console.error("Amazon AI error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while finding Amazon products",
      products: [],
    });
  }
};
