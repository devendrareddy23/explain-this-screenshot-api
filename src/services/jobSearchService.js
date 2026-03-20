import axios from "axios";
import Job from "../models/Job.js";
import IndiaJob from "../models/IndiaJob.js";

function safeText(value) {
  return String(value || "").trim();
}

function buildSearchWords(text) {
  return safeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s/-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function calculateMatchScore({
  title,
  description,
  preferredRoles,
  preferredLocations,
  resumeText,
}) {
  const haystack = `${safeText(title)} ${safeText(description)}`.toLowerCase();

  let score = 0;

  const roleWords = buildSearchWords(preferredRoles);
  const locationWords = buildSearchWords(preferredLocations);
  const resumeWords = buildSearchWords(resumeText).slice(0, 80);

  for (const word of roleWords) {
    if (word.length >= 3 && haystack.includes(word)) score += 8;
  }

  for (const word of locationWords) {
    if (word.length >= 3 && haystack.includes(word)) score += 4;
  }

  for (const word of resumeWords) {
    if (word.length >= 4 && haystack.includes(word)) score += 1;
  }

  if (haystack.includes("node")) score += 10;
  if (haystack.includes("node.js")) score += 10;
  if (haystack.includes("backend")) score += 8;
  if (haystack.includes("express")) score += 6;
  if (haystack.includes("mongodb")) score += 6;
  if (haystack.includes("api")) score += 4;
  if (haystack.includes("javascript")) score += 4;
  if (haystack.includes("remote")) score += 5;

  if (score > 100) score = 100;

  return score;
}

async function fetchJobsFromAdzuna({ search, limit, country, remoteOnly }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    return {
      jobs: [],
      warning: "Missing ADZUNA_APP_ID or ADZUNA_APP_KEY in environment variables.",
    };
  }

  const encodedSearch = encodeURIComponent(search);
  const page = 1;
  const resultsPerPage = Math.min(Number(limit) || 10, 50);
  const normalizedCountry = safeText(country || "in").toLowerCase();

  let url = `https://api.adzuna.com/v1/api/jobs/${normalizedCountry}/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=${resultsPerPage}&what=${encodedSearch}&content-type=application/json`;

  if (remoteOnly) {
    url += `&where=${encodeURIComponent("Remote")}`;
  }

  const response = await axios.get(url, { timeout: 20000 });
  const rawJobs = response?.data?.results || [];

  const jobs = rawJobs.map((job) => ({
    jobId: safeText(job.id),
    title: safeText(job.title),
    company: safeText(job.company?.display_name),
    location: safeText(job.location?.display_name),
    description: safeText(job.description),
    jobUrl: safeText(job.redirect_url),
    source: "Adzuna",
  }));

  return { jobs };
}

export const searchScoreAndStoreJobs = async ({
  search,
  limit = 10,
  resumeText = "",
  preferredRoles = "",
  preferredLocations = "",
  minimumScore = 0,
  remoteOnly = false,
  globalSearch = false,
  country = "in",
  profileEmail = "",
}) => {
  const normalizedEmail = safeText(profileEmail).toLowerCase();
  const normalizedCountry = globalSearch ? "gb" : safeText(country || "in").toLowerCase();

  const { jobs: fetchedJobs, warning } = await fetchJobsFromAdzuna({
    search,
    limit,
    country: normalizedCountry,
    remoteOnly,
  });

  const scoredJobs = [];

  for (const job of fetchedJobs) {
    const matchScore = calculateMatchScore({
      title: job.title,
      description: job.description,
      preferredRoles,
      preferredLocations,
      resumeText,
    });

    const enrichedJob = {
      ...job,
      matchScore,
      score: matchScore,
      searchQuery: safeText(search),
      country: normalizedCountry,
      profileEmail: normalizedEmail,
    };

    scoredJobs.push(enrichedJob);

    await Job.findOneAndUpdate(
      {
        jobId: enrichedJob.jobId || enrichedJob.jobUrl,
        profileEmail: normalizedEmail,
      },
      {
        ...enrichedJob,
        status: matchScore >= Number(minimumScore) ? "shortlisted" : "new",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    if (normalizedEmail) {
      await IndiaJob.findOneAndUpdate(
        {
          jobId: enrichedJob.jobId || enrichedJob.jobUrl,
          profileEmail: normalizedEmail,
        },
        {
          jobId: enrichedJob.jobId || enrichedJob.jobUrl,
          title: enrichedJob.title,
          company: enrichedJob.company,
          location: enrichedJob.location,
          description: enrichedJob.description,
          jobUrl: enrichedJob.jobUrl,
          source: enrichedJob.source,
          profileEmail: normalizedEmail,
          matchScore,
          score: matchScore,
          shortlisted: matchScore >= Number(minimumScore),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
  }

  const filteredJobs = scoredJobs.filter(
    (job) => Number(job.matchScore || 0) >= Number(minimumScore || 0)
  );

  return {
    totalFetched: scoredJobs.length,
    totalMatched: filteredJobs.length,
    jobs: scoredJobs,
    shortlistedJobs: filteredJobs,
    warning: warning || null,
  };
};

export const listStoredJobs = async ({
  country,
  status,
  minimumScore,
  limit,
}) => {
  const query = {};

  if (safeText(country)) {
    query.country = safeText(country).toLowerCase();
  }

  if (safeText(status)) {
    query.status = safeText(status);
  }

  if (minimumScore !== undefined && minimumScore !== null && minimumScore !== "") {
    query.matchScore = { $gte: Number(minimumScore) || 0 };
  }

  const jobs = await Job.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 50);

  return jobs;
};
