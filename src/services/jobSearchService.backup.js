import axios from "axios";
import Job from "../models/Job.js";

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

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

  const combined = `${title} ${description} ${location}`;

  const remoteSignals = [
    "remote",
    "work from home",
    "wfh",
    "anywhere",
    "distributed",
    "telecommute",
    "offshore"
  ];

  const nonRemoteSignals = [
    "onsite",
    "on-site",
    "wfo",
    "work from office",
    "hybrid"
  ];

  const hasRemote = includesAny(combined, remoteSignals);
  const hasNonRemote = includesAny(combined, nonRemoteSignals);

  return hasRemote && !hasNonRemote;
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
  if (text.includes("aws") || text.includes("azure") || text.includes("docker")) {
    score += 8;
  }

  return score;
}

async function fetchAdzunaJobs(search) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Missing ADZUNA_APP_ID or ADZUNA_APP_KEY");
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${DEFAULT_COUNTRY}/search/1`;

  console.log("Fetching Adzuna jobs for search:", search);

  const response = await axios.get(url, {
    params: {
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: DEFAULT_RESULTS_PER_PAGE,
      what: search,
      content_type: "application/json"
    },
    timeout: 15000
  });

  console.log("Adzuna status:", response.status);
  console.log("Adzuna results count:", response.data?.results?.length || 0);

  return response.data?.results || [];
}

export async function searchScoreAndStoreJobs({
  search,
  remoteOnly = false,
  profileEmail = ""
}) {
  console.log("DEBUG: searchScoreAndStoreJobs called");

  try {
    const rawJobs = await fetchAdzunaJobs(search);

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
      await Job.findOneAndUpdate(
        { jobId: job.jobId, profileEmail },
        job,
        { upsert: true, new: true }
      );
    }

    return {
      success: true,
      totalFetched: rawJobs.length,
      totalMatched: matchedJobs.length,
      jobs: matchedJobs
    };
  } catch (error) {
    console.error("searchScoreAndStoreJobs error:", error.response?.data || error.message);

    return {
      success: true,
      totalFetched: 0,
      totalMatched: 0,
      jobs: [],
      warning: "Failed to fetch jobs from Adzuna"
    };
  }
}
