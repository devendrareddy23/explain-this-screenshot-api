const buildLinkedInSearchUrl = ({ company = "", recruiterEmail = "" }) => {
  const query = [recruiterEmail ? recruiterEmail.split("@")[0] : "", company, "recruiter"]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!query) {
    return "";
  }

  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
};

const extractHiringSignals = (job = {}) => {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  const signals = [];

  if (text.includes("distributed systems") || text.includes("scal")) {
    signals.push("scaling core systems");
  }
  if (text.includes("payments")) {
    signals.push("payments infrastructure");
  }
  if (text.includes("backend") || text.includes("api") || text.includes("microservice")) {
    signals.push("backend platform hiring");
  }
  if (text.includes("data")) {
    signals.push("data-heavy engineering");
  }
  if (text.includes("product")) {
    signals.push("product-focused engineering");
  }

  return [...new Set(signals)].slice(0, 4);
};

export const buildRecruiterIntelligence = async ({ job, recruiterEmail = "", recruiterName = "" }) => {
  const hiringSignals = extractHiringSignals(job);
  const company = String(job?.company || "").trim();

  return {
    recruiterName: recruiterName || "",
    recruiterEmail,
    linkedinProfileUrl: buildLinkedInSearchUrl({ company, recruiterEmail }),
    recentPosts: [],
    recentPostsStatus:
      "LinkedIn post intelligence unavailable unless a verified provider is connected. No post content was invented.",
    recentHiringFocus: hiringSignals,
    recentHiringFocusStatus: hiringSignals.length
      ? "Inferred from the current job description and related hiring language."
      : "No hiring-focus signal could be inferred from the job post.",
    careerBackgroundSummary:
      "Recruiter career background unavailable without a verified people-data source.",
    careerBackgroundStatus:
      "No verified recruiter-profile provider is connected.",
    mutualConnections: [],
    mutualConnectionsCount: 0,
    mutualConnectionsStatus:
      "Mutual connections unavailable because HireFlow is not connected to the user's social graph.",
    verifiedContextSummary: [
      company ? `Hiring for ${company}` : "",
      hiringSignals.length ? `Focus areas: ${hiringSignals.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(". "),
  };
};
