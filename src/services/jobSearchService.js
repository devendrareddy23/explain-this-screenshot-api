import axios from "axios";
import Job from "../models/Job.js";

const DEFAULT_COUNTRY = "in";
const DEFAULT_RESULTS_PER_PAGE = 20;

function normalizeText(value = "") {
  return String(value).toLowerCase().trim();
}

function includesAny(text = "", keywords = []) {
  const normalized = normalizeText(text);
  return keywords.some((word) => normalized.includes(normalizeText(word)));
}

function detectRemote(job = {}) {
  const title = normalizeText(job.title);
  const description = normalizeText(job.description);
  const location = normalizeText(job.location?.display_name || "");

  const combined = `${title} ${description}`;

  const strongRemoteSignals = [
    "fully remote",
    "remote role",
    "remote position",
    "100% remote",
    "work from home",
    "wfh",
    "anywhere in india",
    "remote",
    "offshore"
  ];

  const strongNonRemoteSignals = [
    "onsite",
    "on-site",
    "work from office",
    "wfo",
    "hybrid",
    "office location",
    "navi mumbai",
    "bangalore",
    "bengaluru",
    "chennai",
    "hyderabad",
    "pune",
    "gurgaon",
    "noida"
  ];

  const hasRemote = includesAny(combined, strongRemoteSignals);
  const hasNonRemote = includesAny(`${combined} ${location}`, strongNonRemoteSignals);

  if (hasNonRemote) return false;
  return hasRemote;
}

function calculateScore(job = {}) {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();

  let score = 0;
  if (text.includes("node")) score += 20;
  if (text.includes("backend")) score += 15;
  if (text.includes("api")) score += 10;
  if (text.includes("mongodb")) score += 10;
  if (text.includes("javascript")) score += 10;
  if (text.includes("express")) score += 10;
  if (text.includes("microservices")) score += 8;
  if (text.includes("aws") || text.includes("azure") || text.includes("docker")) score += 8;

  return score;
}

async function fetchAdzunaJobs(search, country = DEFAULT_COUNTRY, limit = DEFAULT_RESULTS_PER_PAGE) {
  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaAppKey = process.env.ADZUNA_APP_KEY;

  if (!adzunaAppId || !adzunaAppKey) {
    throw new Error("Missing ADZUNA_APP_ID or ADZUNA_APP_KEY");
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1`;

  const response = await axios.get(url, {
    params: {
      app_id: adzunaAppId,
      app_key: adzunaAppKey,
      results_per_page: limit,
      what: search
    },
    timeout: 15000
  });

  return response.data?.results || [];
}

export async function searchScoreAndStoreJobs({
  search,
  remoteOnly = false,
  profileEmail = "",
  country = DEFAULT_COUNTRY,
  limit = DEFAULT_RESULTS_PER_PAGE
}) {
  try {
    const rawJobs = await fetchAdzunaJobs(search, country, limit);

    const mappedJobs = rawJobs.map((job) => {
      const remote = detectRemote(job);
      const score = calculateScore(job);

      return {
        jobId: String(job.id || ""),
        title: job.title || "Untitled Role",
        company: job.company?.display_name || "Unknown Company",
        location: job.location?.display_name || "Unknown",
        description: job.description || "",
        jobUrl: job.redirect_url || "",
        source: "Adzuna",
        country,
        remote,
        matchScore: score,
        score,
        profileEmail
      };
    });

    const filteredJobs = remoteOnly
      ? mappedJobs.filter((job) => job.remote === true)
      : mappedJobs;

    const matchedJobs = filteredJobs.filter((job) => job.score >= 30);

    for (const job of matchedJobs) {
      if (profileEmail) {
        await Job.findOneAndUpdate(
          { jobId: job.jobId, profileEmail },
          job,
          { upsert: true, new: true }
        );
      }
    }

    return {
      success: true,
      totalFetched: rawJobs.length,
      totalMatched: matchedJobs.length,
      jobs: matchedJobs,
      shortlistedJobs: []
    };
  } catch (error) {
    console.error("searchScoreAndStoreJobs error:", error.response?.data || error.message);

    return {
      success: true,
      totalFetched: 0,
      totalMatched: 0,
      jobs: [],
      shortlistedJobs: [],
      warning: "Failed to fetch jobs from Adzuna"
    };
  }
}
