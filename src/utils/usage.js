import User from "../models/User.js";

export const checkAndUpdateUsage = async (userId, type) => {
  const user = await User.findById(userId);

  if (!user) {
    return { allowed: false };
  }

  const today = new Date().toDateString();

  // reset daily usage
  if (user.usageDate !== today) {
    user.usageDate = today;
    user.resumeCount = 0;
    user.coverLetterCount = 0;
  }

  // PRO USERS → unlimited
  if (user.plan === "pro") {
    return {
      allowed: true,
      resumeRemaining: "unlimited",
      coverLetterRemaining: "unlimited",
    };
  }

  // FREE USER LIMITS
  if (type === "resume") {
    if (user.resumeCount >= 3) {
      return { allowed: false };
    }
    user.resumeCount += 1;
  }

  if (type === "coverLetter") {
    if (user.coverLetterCount >= 2) {
      return { allowed: false };
    }
    user.coverLetterCount += 1;
  }

  await user.save();

  return {
    allowed: true,
    resumeRemaining: 3 - user.resumeCount,
    coverLetterRemaining: 2 - user.coverLetterCount,
  };
};
