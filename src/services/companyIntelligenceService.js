import axios from "axios";

const TECH_KEYWORDS = [
  "Node.js",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "AWS",
  "Docker",
  "Kubernetes",
  "Python",
  "Java",
  "Go",
  "GraphQL",
  "REST APIs",
  "Microservices",
  "CI/CD",
];

const COMMON_COMPLAINT_HINTS = [
  "slow growth",
  "poor management",
  "work life balance",
  "bureaucracy",
  "low pay",
  "burnout",
  "long hours",
];

const extractTechStack = (job = {}) => {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();

  return TECH_KEYWORDS.filter((item) => text.includes(item.toLowerCase())).slice(0, 8);
};

const estimateTimeToHire = (job = {}) => {
  const source = String(job.source || "").toLowerCase();
  const description = String(job.description || "").toLowerCase();

  if (description.includes("immediate joiner") || description.includes("urgent hiring")) {
    return {
      label: "1-2 weeks estimated",
      isEstimated: true,
      source: "Derived from urgent hiring language in the job post.",
    };
  }

  if (source.includes("linkedin") || source.includes("indeed")) {
    return {
      label: "2-4 weeks estimated",
      isEstimated: true,
      source: "Estimated from common marketplace hiring cycles.",
    };
  }

  return {
    label: "3-5 weeks estimated",
    isEstimated: true,
    source: "Estimated from generalized software hiring timelines.",
  };
};

const buildSalaryInsight = (job = {}) => {
  const min = Number(job.salaryMin);
  const max = Number(job.salaryMax);
  const currency = String(job.salaryCurrency || "").trim();
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  if (Number.isFinite(min) && Number.isFinite(max)) {
    return {
      label: `${currency} ${formatter.format(min)}-${formatter.format(max)}`.trim(),
      source: "Job post",
    };
  }

  if (Number.isFinite(min)) {
    return {
      label: `${currency} ${formatter.format(min)}+`.trim(),
      source: "Job post",
    };
  }

  return {
    label: "Salary not listed",
    source: "No verified compensation data available yet.",
  };
};

const buildRecommendation = (job = {}, intelligence = {}) => {
  const score = Number(job.aiScore10 || 0);
  const rating = Number(intelligence.glassdoorRating || 0);

  if (score >= 8 && (!rating || rating >= 3.7)) {
    return {
      label: "Recommended to Apply",
      reason: "High match score with no negative company signal confirmed.",
    };
  }

  if (score >= 5) {
    return {
      label: "Worth Reviewing",
      reason: "Solid match, but review company signals before applying.",
    };
  }

  return {
    label: "Proceed Carefully",
    reason: "Match strength is weaker or company signals are mixed.",
  };
};

const buildRecruiterCard = (outreach = null, job = {}) => {
  const companySlug = encodeURIComponent(String(job.company || "").trim());

  if (outreach?.recruiterEmail) {
    return {
      recruiterEmail: outreach.recruiterEmail,
      recruiterName: outreach.recruiterName || "",
      linkedinUrl: companySlug
        ? `https://www.linkedin.com/search/results/people/?keywords=${companySlug}%20recruiter`
        : "",
      source: "Hunter/email outreach data",
    };
  }

  return {
    recruiterEmail: "",
    recruiterName: "",
    linkedinUrl: companySlug
      ? `https://www.linkedin.com/search/results/people/?keywords=${companySlug}%20recruiter`
      : "",
    source: "No recruiter contact found yet.",
  };
};

const fetchCompanyNews = async (companyName = "") => {
  const apiKey = String(process.env.NEWS_API_KEY || "").trim();
  const q = String(companyName || "").trim();

  if (!apiKey || !q) {
    return {
      items: [],
      source: !apiKey ? "NEWS_API_KEY not configured." : "Company name unavailable.",
    };
  }

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q,
        pageSize: 3,
        sortBy: "publishedAt",
        apiKey,
      },
      timeout: 12000,
    });

    const items = Array.isArray(response.data?.articles)
      ? response.data.articles.slice(0, 3).map((item) => ({
          title: String(item.title || "").trim(),
          url: String(item.url || "").trim(),
          publishedAt: item.publishedAt || null,
        }))
      : [];

    return {
      items,
      source: items.length ? "NewsAPI" : "No recent verified news found.",
    };
  } catch (error) {
    return {
      items: [],
      source: error.message || "News lookup failed.",
    };
  }
};

export const buildCompanyIntelligence = async ({ job, outreach = null }) => {
  const techStack = extractTechStack(job);
  const timeToHire = estimateTimeToHire(job);
  const salaryInsight = buildSalaryInsight(job);
  const recruiter = buildRecruiterCard(outreach, job);
  const news = await fetchCompanyNews(job?.company || "");

  const intelligence = {
    glassdoorRating: null,
    commonComplaints: [],
    glassdoorStatus: "No verified Glassdoor provider configured.",
    recentNews: news.items,
    recentNewsStatus: news.source,
    growthSignal:
      news.items.length > 0
        ? "Recent company news found"
        : "No verified funding/layoff signal available yet.",
    techStack,
    salaryInsight,
    timeToHire,
    recruiter,
    interviewProcess: {
      summary: "Interview process data unavailable until a verified review source is connected.",
      source: "Not currently connected",
    },
  };

  const recommendation = buildRecommendation(job, intelligence);

  return {
    ...intelligence,
    recommendation,
    matchScore10: Number(job?.aiScore10 || 0),
    confidenceNotes: [
      "Tech stack is inferred from the job post.",
      timeToHire.isEstimated ? timeToHire.source : "",
      intelligence.glassdoorStatus,
      news.source,
    ].filter(Boolean),
  };
};
