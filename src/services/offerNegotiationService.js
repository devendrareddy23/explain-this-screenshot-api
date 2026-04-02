import OpenAI from "openai";
import { OPENAI_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

const normalizeText = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseCurrency = (job = {}, fallback = "INR") => {
  const currency = normalizeText(job?.salaryCurrency || "");
  return currency || fallback;
};

const formatMoney = (amount, currency = "INR") => {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  if (currency.toUpperCase() === "INR") {
    const lpa = numeric >= 100000 ? numeric / 100000 : numeric;
    return `₹${lpa.toFixed(1)} LPA`;
  }

  return `${currency.toUpperCase()} ${Math.round(numeric).toLocaleString("en-US")}`;
};

const getOpenAIClient = () => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
};

const buildSources = ({ hasJobSalary, hasCareerTarget, hasExpectedSalary }) => [
  {
    name: "Levels.fyi",
    status: "unavailable",
    note: "No verified Levels.fyi provider is connected in this environment.",
  },
  {
    name: "Glassdoor",
    status: "unavailable",
    note: "No verified Glassdoor provider is connected in this environment.",
  },
  {
    name: "LinkedIn Salary",
    status: "unavailable",
    note: "No verified LinkedIn Salary provider is connected in this environment.",
  },
  {
    name: "Job post salary",
    status: hasJobSalary ? "used" : "missing",
    note: hasJobSalary ? "Derived from the compensation listed on the job or imported source." : "The job post did not expose a reliable salary range.",
  },
  {
    name: "Career DNA target",
    status: hasCareerTarget ? "used" : "missing",
    note: hasCareerTarget ? "Derived from the user's stated must-say-yes salary target." : "No salary target was captured in Career DNA.",
  },
  {
    name: "Saved salary preference",
    status: hasExpectedSalary ? "used" : "missing",
    note: hasExpectedSalary ? "Derived from the user's saved expected salary preference." : "No saved expected salary preference is available.",
  },
];

const buildMarketBenchmark = ({
  job,
  companyIntelligence,
  offerAmount,
  currency,
  expectedSalaryMin,
  careerDna,
}) => {
  const salaryMin = Number(job?.salaryMin || 0);
  const salaryMax = Number(job?.salaryMax || 0);
  const expected = Number(expectedSalaryMin || 0);
  const target = Number(careerDna?.salaryTargetValue || 0);
  const samples = [salaryMin, salaryMax, expected, target].filter((value) => Number.isFinite(value) && value > 0);
  const benchmarkCurrency = normalizeText(currency) || parseCurrency(job);
  const marketMin = salaryMin > 0 ? salaryMin : samples.length ? Math.min(...samples) : null;
  const marketMax = salaryMax > 0 ? salaryMax : samples.length ? Math.max(...samples) : null;
  const midpoint =
    marketMin && marketMax
      ? Math.round((marketMin + marketMax) / 2)
      : marketMax || marketMin || null;
  const delta = midpoint && Number.isFinite(Number(offerAmount)) ? Math.round(Number(offerAmount) - midpoint) : 0;

  let comparisonSummary = "Market comparison is still directional because verified third-party salary providers are not connected.";
  let recommendation = "Review the role scope and negotiate if the package feels light for the market signal.";
  let recommendationStrength = "neutral";

  if (midpoint && offerAmount) {
    const absoluteGap = Math.abs(delta);

    if (delta <= -100000) {
      comparisonSummary = `This offer is ${formatMoney(absoluteGap, benchmarkCurrency)} below the current market signal.`;
      recommendation = "You should negotiate. The offer appears meaningfully below the market range HireFlow can verify.";
      recommendationStrength = "strong";
    } else if (delta < 0) {
      comparisonSummary = `This offer is ${formatMoney(absoluteGap, benchmarkCurrency)} below the current market signal.`;
      recommendation = "You should negotiate, but keep the ask close to the midpoint and grounded in the role scope.";
      recommendationStrength = "moderate";
    } else if (delta >= 100000) {
      comparisonSummary = `This offer is ${formatMoney(delta, benchmarkCurrency)} above the current market signal.`;
      recommendation = "This package looks strong. Negotiate only if scope, title, equity, or flexibility still need work.";
      recommendationStrength = "neutral";
    } else {
      comparisonSummary = "This offer is roughly in line with the current market signal.";
      recommendation = "Negotiate selectively around title, growth, flexibility, or a small compensation bump.";
      recommendationStrength = "neutral";
    }
  }

  if (companyIntelligence?.salaryInsight?.label && !samples.length) {
    comparisonSummary = `The best salary signal right now comes from the company/job post: ${companyIntelligence.salaryInsight.label}.`;
  }

  return {
    min: marketMin,
    max: marketMax,
    midpoint,
    currency: benchmarkCurrency,
    comparisonSummary,
    recommendation,
    deltaFromMarket: delta,
    recommendationStrength,
    sources: buildSources({
      hasJobSalary: Boolean(salaryMin || salaryMax),
      hasCareerTarget: Boolean(target),
      hasExpectedSalary: Boolean(expected),
    }),
  };
};

const buildFallbackNegotiationScript = ({ application, benchmark, offerAmount }) => {
  const amountText = formatMoney(offerAmount, benchmark.currency) || "this offer";
  const midpointText = formatMoney(benchmark.midpoint, benchmark.currency) || "the current market range";

  return `Say exactly this in your reply email:\n\nHi team,\n\nThank you for the offer for the ${application?.title || "role"} role. I’m genuinely excited about the opportunity and the scope of work. Based on the responsibilities, the market signal for comparable roles, and the value I believe I can create quickly, I was hoping we could revisit the compensation. At ${amountText}, the offer appears below the current market midpoint of ${midpointText}. If there’s room to move closer to that range, I’d feel much more comfortable moving forward quickly.\n\nI’m very enthusiastic about the role and would love to find a package that reflects both the scope and the impact I can bring.\n\nBest,\n${application?.profileEmail || "Candidate"}`;
};

const buildFallbackCounterScript = ({ application, benchmark, counterOfferAmount }) => {
  const counterText = formatMoney(counterOfferAmount, benchmark.currency) || "the revised offer";
  return `Say exactly this next:\n\nThanks for sharing the updated package for the ${application?.title || "role"} role. I appreciate the movement and I’m excited about the chance to join ${application?.company || "the team"}. I’m very close to saying yes. If we can land at ${counterText} with the rest of the scope unchanged, I’d be comfortable moving forward and wrapping this up quickly.\n\nI’m enthusiastic about the role and would love to make this work.`;
};

const buildScriptPrompt = ({ application, benchmark, offerAmount }) => `You are HireFlow AI, a high-stakes compensation coach.

Role: ${normalizeText(application?.title)}
Company: ${normalizeText(application?.company)}
Current offer: ${formatMoney(offerAmount, benchmark.currency)}
Market midpoint: ${formatMoney(benchmark.midpoint, benchmark.currency)}
Comparison summary: ${normalizeText(benchmark.comparisonSummary)}
Recommendation: ${normalizeText(benchmark.recommendation)}

Write a negotiation reply email that:
- sounds human and confident
- is specific to this situation
- clearly asks for a better package when appropriate
- is concise and recruiter-friendly
- includes the exact words the candidate can send

Return plain text only.`;

const buildCounterPrompt = ({ application, benchmark, currentOfferAmount, candidateGoal }) => `You are HireFlow AI, a compensation negotiation coach.

Role: ${normalizeText(application?.title)}
Company: ${normalizeText(application?.company)}
Counter offer received: ${formatMoney(currentOfferAmount, benchmark.currency)}
Market midpoint: ${formatMoney(benchmark.midpoint, benchmark.currency)}
Candidate goal: ${normalizeText(candidateGoal)}
Recommendation: ${normalizeText(benchmark.recommendation)}

Write the next reply the candidate should send.
Rules:
- be calm, confident, and specific
- keep it short
- do not sound aggressive
- move the conversation toward a stronger package

Return plain text only.`;

export const prepareOfferNegotiation = async ({
  application,
  job,
  companyIntelligence,
  expectedSalaryMin,
  careerDna,
  offerAmount,
  currency,
}) => {
  const benchmark = buildMarketBenchmark({
    job,
    companyIntelligence,
    offerAmount,
    currency,
    expectedSalaryMin,
    careerDna,
  });
  const client = getOpenAIClient();

  if (!client) {
    return {
      marketBenchmark: benchmark,
      negotiationScript: buildFallbackNegotiationScript({
        application,
        benchmark,
        offerAmount,
      }),
    };
  }

  try {
    const response = await withServiceTimeout(
      () =>
        client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.45,
          messages: [
            {
              role: "system",
              content: "Write only the negotiation email text. Be specific, credible, and concise.",
            },
            {
              role: "user",
              content: buildScriptPrompt({ application, benchmark, offerAmount }),
            },
          ],
        }),
      OPENAI_TIMEOUT_MS,
      "Offer negotiation generation timed out."
    );

    return {
      marketBenchmark: benchmark,
      negotiationScript:
        normalizeText(response.choices?.[0]?.message?.content) ||
        buildFallbackNegotiationScript({ application, benchmark, offerAmount }),
    };
  } catch (error) {
    console.error("Offer negotiation script generation failed, using fallback:", error.message);
    return {
      marketBenchmark: benchmark,
      negotiationScript: buildFallbackNegotiationScript({ application, benchmark, offerAmount }),
    };
  }
};

export const prepareCounterResponse = async ({
  application,
  benchmark,
  currentOfferAmount,
  candidateGoal,
}) => {
  const client = getOpenAIClient();

  if (!client) {
    return buildFallbackCounterScript({
      application,
      benchmark,
      counterOfferAmount: currentOfferAmount,
    });
  }

  try {
    const response = await withServiceTimeout(
      () =>
        client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            {
              role: "system",
              content: "Write only the next negotiation reply. Keep it concise, human, and specific.",
            },
            {
              role: "user",
              content: buildCounterPrompt({ application, benchmark, currentOfferAmount, candidateGoal }),
            },
          ],
        }),
      OPENAI_TIMEOUT_MS,
      "Counter-offer reply generation timed out."
    );

    return (
      normalizeText(response.choices?.[0]?.message?.content) ||
      buildFallbackCounterScript({
        application,
        benchmark,
        counterOfferAmount: currentOfferAmount,
      })
    );
  } catch (error) {
    console.error("Counter response generation failed, using fallback:", error.message);
    return buildFallbackCounterScript({
      application,
      benchmark,
      counterOfferAmount: currentOfferAmount,
    });
  }
};

export const summarizeNegotiationWin = ({ initialOfferAmount, finalOfferAmount, currency = "INR" }) => {
  const initial = Number(initialOfferAmount || 0);
  const final = Number(finalOfferAmount || 0);

  if (!initial || !final || final <= initial) {
    return {
      upliftAmount: Math.max(0, final - initial),
      summary: "No positive uplift has been recorded yet.",
    };
  }

  const uplift = final - initial;
  return {
    upliftAmount: uplift,
    summary: `HireFlow helped you negotiate ${formatMoney(uplift, currency)} more than the first offer.`,
  };
};

export const getRecommendationChipTone = (strength = "neutral") => {
  if (strength === "strong") return "green";
  if (strength === "moderate") return "amber";
  return "dark";
};

export const getOfferGapLabel = (deltaFromMarket = 0, currency = "INR") => {
  const delta = Number(deltaFromMarket || 0);
  if (!delta) {
    return "Offer is roughly at market";
  }

  if (delta < 0) {
    return `Offer is ${formatMoney(Math.abs(delta), currency)} below market`;
  }

  return `Offer is ${formatMoney(delta, currency)} above market`;
};
