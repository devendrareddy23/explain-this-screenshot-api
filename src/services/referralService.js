import crypto from "crypto";
import User from "../models/User.js";

const generateCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

export const ensureReferralCode = async (user) => {
  if (!user) return "";
  if (user.referralCode) return user.referralCode;

  let referralCode = generateCode();
  let exists = await User.findOne({ referralCode }).select("_id");

  while (exists) {
    referralCode = generateCode();
    exists = await User.findOne({ referralCode }).select("_id");
  }

  user.referralCode = referralCode;
  await user.save();
  return referralCode;
};

export const applyReferralReward = async ({ newUser, referralCode }) => {
  const normalizedCode = String(referralCode || "").trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const referrer = await User.findOne({ referralCode: normalizedCode });

  if (!referrer || String(referrer._id) === String(newUser._id)) {
    return null;
  }

  referrer.referralFreeMonthsEarned = Number(referrer.referralFreeMonthsEarned || 0) + 1;
  referrer.referralCreditsExpiresAt = extendDateByDays(referrer.referralCreditsExpiresAt, 30);
  await referrer.save();

  newUser.referredBy = referrer._id;
  newUser.referralFreeWeeksGranted = 2;
  newUser.trialEndsAt = extendDateByDays(newUser.trialEndsAt, 14);
  await newUser.save();

  return referrer;
};

const extendDateByDays = (date, days) => {
  const base = date ? new Date(date) : new Date();
  base.setDate(base.getDate() + days);
  return base;
};

export const getReferralStats = async (userId) => {
  const referredUsers = await User.find({ referredBy: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name email createdAt trialEndsAt");
  const referralsCount = await User.countDocuments({ referredBy: userId });
  const user = await User.findById(userId).select(
    "referralCode referralFreeMonthsEarned referralFreeWeeksGranted referralCreditsExpiresAt trialEndsAt"
  );

  return {
    referralCode: user?.referralCode || "",
    referralsCount,
    freeMonthsEarned: Number(user?.referralFreeMonthsEarned || 0),
    bonusWeeksGranted: Number(user?.referralFreeWeeksGranted || 0),
    referralCreditsExpiresAt: user?.referralCreditsExpiresAt || null,
    trialEndsAt: user?.trialEndsAt || null,
    recentReferrals: referredUsers.map((item) => ({
      _id: item._id,
      name: item.name || item.email,
      email: item.email,
      createdAt: item.createdAt,
      trialEndsAt: item.trialEndsAt || null,
    })),
  };
};
