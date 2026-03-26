import axios from "axios";
import Job from "../models/Job.js";

const expandSearchTerms = (search) => {
  const base = String(search || "").trim();

  const terms = [
    base,
    "node js developer",
    "node developer",
    "backend developer",
    "backend engineer",
    "software engineer node js",
    "express js developer",
    "api developer",
    "javascript backend developer",
  ];

  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
};

const includesAny = (text, keywords = []) => {
  return keywords.some((keyword) => text.includes(keyword));
};

const scoreJob = (job) => {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();

  let score = 0;
  const reasons = [];

  if (includesAny(text, ["node", "node.js", "node js"])) {
    score += 40;
    reasons.push("Node.js match");
  }

  if (includesAny(text, ["backend", "back-end", "server side", "server-side"])) {
    score += 30;
    reasons.push("Backend match");
  }

  if (includesAny(text, ["express", "express.js", "express js"])) {
    score += 20;
    reasons.push("Express match");
  }

  if (includesAny(text, ["api", "rest api", "restful", "microservices"])) {
    score += 10;
    reasons.push("API match");
  }

  if (includesAny(text, ["mongodb", "mongoose", "database", "postgresql", "sql"])) {
    score += 10;
    reasons.push("Database match");
  }

  if (includesAny(text, ["aws", "azure", "docker", "ci/cd"])) {
    score += 5;
    reasons.push("Cloud/devops bonus");
  }

  if (includesAny(text, ["frontend", "front-end", "react native"])) {
    score -= 20;
  }

  if (includesAny(text, ["wordpress", "shopify"])) {
    score -= 30;
  }

  if (includesAny(text, ["php", "laravel"])) {
    score -= 10;
  }

  return { score, reasons };
};

const getMatchLabel = (score) => {
  if (score >= 60) return "Top Match";
  if (score >= 35) return "Good Match";
  return "Low Match";
};

const looksRemote = (job) => {
  const locationText = (job.location?.display_name || "").toLowerCase();
  const titleText = (job.title || "").toLowerCase();
  const descriptionText = (job.description || "").toLowerCase();
  const combined = `${locationText} ${titleText} ${descriptionText}`;

  return (
    combined.includes("remote") ||
    combined.includes("work from home") ||
    combined.includes("work-from-home") ||
    combined.includes("wfh") ||
    combined.includes("anywhere")
  );
};

const fetchAdzunaJobsForTerm = async ({ term, country, location, limit, appId, appKey }) => {
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;

  const params = {
    app_id: appId,
    app_key: appKey,
    results_per_page: limit,
    what: term,
  };

  if (location && String(location).trim()) {
    params.where = String(location).trim();
  }

  const response = await axios.get(url, {
    params,
    timeout: 20000,
  });

  return Array.isArray(response.data?.results) ? response.data.results : [];
};

export const searchScoreAndStoreJobs = async ({
  search,
  location = "",
  country = "in",
  remoteOnly = false,
  profileEmail,
  limit = 20,
  minimumScore = 0,
}) => {
  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      throw new Error("Missing Adzuna credentials");
    }

    if (!profileEmail) {
      throw new Error("Missing profile email");
    }

    const safeCountry = String(country || "in").trim().toLowerCase();
    const safeLocation = String(location || "").trim();
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const searchTerms = expandSearchTerms(search);
    const allJobs = [];
    const failedTerms = [];

    for (const term of searchTerms) {
      try {
        const jobs = await fetchAdzunaJobsForTerm({
          term,
          country: safeCountry,
          location: safeLocation,
          limit: safeLimit,
          appId,
          appKey,
        });

        allJobs.push(...jobs);
      } catch (error) {
        const message =
          error.response?.data?.results?.[0]?.message ||
          error.response?.data?.message ||
          error.message;

        console.error(`Adzuna fetch failed for term "${term}":`, message);
        failedTerms.push({ term, message });
      }
    }

    const uniqueJobsMap = new Map();

    for (const job of allJobs) {
      if (!job?.id) continue;
      uniqueJobsMap.set(String(job.id), job);
    }

    const uniqueJobs = Array.from(uniqueJobsMap.values());

    const processedJobs = uniqueJobs.map((job) => {
      const { score, reasons } = scoreJob(job);
      const remote = looksRemote(job);
      const matchLabel = getMatchLabel(score);

      return {
        jobId: String(job.id || ""),
        profileEmail,
        title: String(job.title || ""),
        company: String(job.company?.display_name || ""),
        location: String(job.location?.display_name || ""),
        description: String(job.description || ""),
        jobUrl: String(job.redirect_url || ""),
        applyUrl: String(job.redirect_url || ""),
        source: "Adzuna",
        sourceUrl: String(job.redirect_url || ""),
        country: safeCountry,
        remote,
        employmentType: "",
        salaryMin: typeof job.salary_min === "number" ? job.salary_min : null,
        salaryMax: typeof job.salary_max === "number" ? job.salary_max : null,
        salaryCurrency: "",
        score,
        matchScore: score,
        reasons: [...reasons, matchLabel],
        shortlisted: score >= 35,
        rawJobData: job,
      };
    });

    const filteredJobs = processedJobs.filter((job) => {
      if (!job.jobId || !job.title) return false;
      if (job.score < Math.max(20, Number(minimumScore) || 0)) return false;
      if (remoteOnly && !job.remote) return false;
      return true;
    });

    filteredJobs.sort((a, b) => b.score - a.score);

    await Job.deleteMany({ profileEmail });

    if (filteredJobs.length === 0) {
      return {
        success: true,
        totalFetched: allJobs.length,
        totalFinal: 0,
        jobs: [],
        failedTerms,
      };
    }

    const savedJobs = await Job.insertMany(filteredJobs, { ordered: false });

    return {
      success: true,
      totalFetched: allJobs.length,
      totalFinal: savedJobs.length,
      jobs: savedJobs,
      failedTerms,
    };
  } catch (error) {
    console.error("Job search fatal error:", error.response?.data || error.message);

    return {
      success: false,
      message: error.message || "Failed to fetch jobs",
      totalFetched: 0,
      totalFinal: 0,
      jobs: [],
      failedTerms: [],
    };
  }
};
