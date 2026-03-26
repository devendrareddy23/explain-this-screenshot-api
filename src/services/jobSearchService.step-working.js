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
  if (text.includes("aws") || text.includes("azure") || text.includes("docker")) score += 8;

  return score;
}

async function fetchAdzunaJobs(search, country = DEFAULT_COUNTRY, limit = DEFAULT_RESULTS_PER_PAGE) {
  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaAppKey = process.env.ADZUNA_APP_KEY;

  console.log("DEBUG env app id exists:", !!adzunaAppId);
  console.log("DEBUG env app key exists:", !!adzunaAppKey);
  console.log("DEBUG search:", search);
  console.log("DEBUG country:", country);
  console.log("DEBUG limit:", limit);

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

  console.log("DEBUG Adzuna status:", response.status);
  console.log("DEBUG Adzuna results count:", response.data?.results?.length || 0);

  return response.data?.results || [];
}

export async function searchScoreAndStoreJobs({
  search,
  remoteOnly = false,
  profileEmail = "",
  country = DEFAULT_COUNTRY,
  limit = DEFAULT_RESULTS_PER_PAGE
}) {
  console.log("DEBUG searchScoreAndStoreJobs called");
  console.log("DEBUG remoteOnly:", remoteOnly);
  console.log("DEBUG profileEmail:", profileEmail);

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

    console.log("DEBUG mappedJobs:", mappedJobs.length);
    console.log("DEBUG filteredJobs:", filteredJobs.length);
    console.log("DEBUG matchedJobs:", matchedJobs.length);

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
      jobs: matchedJobs,
      shortlistedJobs: []
    };
  } catch (error) {
    console.error("DEBUG FULL ERROR MESSAGE:", error.message);
    console.error("DEBUG FULL ERROR STATUS:", error.response?.status || "NO_STATUS");
    console.error("DEBUG FULL ERROR DATA:", error.response?.data || "NO_RESPONSE_DATA");
    console.error("DEBUG FULL ERROR STACK:", error.stack);

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
