import AmazonUsage from "../models/AmazonUsage.js";

const FREE_AMAZON_DAILY_LIMIT = Number(process.env.FREE_AMAZON_DAILY_LIMIT || 2);

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getAmazonDailyLimit() {
  return FREE_AMAZON_DAILY_LIMIT;
}

export async function getAmazonUsageStatus({ userId, isProUser }) {
  if (isProUser) {
    return {
      isProUser: true,
      dateKey: getTodayDateKey(),
      dailyLimit: null,
      usedCount: 0,
      remainingCount: null,
      hasAccess: true,
    };
  }

  const dateKey = getTodayDateKey();

  const usage = await AmazonUsage.findOne({
    userId,
    dateKey,
  });

  const usedCount = usage?.count || 0;
  const remainingCount = Math.max(0, FREE_AMAZON_DAILY_LIMIT - usedCount);

  return {
    isProUser: false,
    dateKey,
    dailyLimit: FREE_AMAZON_DAILY_LIMIT,
    usedCount,
    remainingCount,
    hasAccess: remainingCount > 0,
  };
}

export async function consumeAmazonUsage({ userId, isProUser }) {
  if (isProUser) {
    return {
      isProUser: true,
      dateKey: getTodayDateKey(),
      dailyLimit: null,
      usedCount: 0,
      remainingCount: null,
      hasAccess: true,
    };
  }

  const dateKey = getTodayDateKey();

  const usage = await AmazonUsage.findOneAndUpdate(
    { userId, dateKey },
    {
      $setOnInsert: {
        userId,
        dateKey,
      },
      $inc: {
        count: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  const usedCount = usage?.count || 0;
  const remainingCount = Math.max(0, FREE_AMAZON_DAILY_LIMIT - usedCount);

  return {
    isProUser: false,
    dateKey,
    dailyLimit: FREE_AMAZON_DAILY_LIMIT,
    usedCount,
    remainingCount,
    hasAccess: remainingCount > 0,
  };
}
