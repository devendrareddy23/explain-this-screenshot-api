const { parseStringPromise } = require("xml2js");
const SearchProfile = require("../models/SearchProfile");
const Job = require("../models/Job");
const MatchedJob = require("../models/MatchedJob");

const REMOTIVE_BASE_URL = "https://remotive.com/api/remote-jobs";
const WWR_RSS_URL = "https://weworkremotely.com/remote-jobs.rss";
const REMOTEOK_JSON_URL = "https://remoteok.com/api";

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function buildSearchQueries(search, preferredRoles) {
  const queries = new Set();

  if (search && search.trim()) {
    queries.add(search.trim());
  }

  preferredRoles
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((role) => queries.add(role));

  [
    "backend engineer",
    "backend developer",
    "node.js developer",
    "nodejs developer",
    "software engineer backend",
    "api developer",
    "express developer",
    "javascript backend developer",
  ].forEach((q) => queries.add(q));

  return Array.from(queries);
}

function dedupeJobs(jobs) {
  const seen = new Set();
  const unique = [];

  for (const job of jobs) {
    const key = `${job.source}-${job.externalId || ""}-${job.url || ""}-${job.title || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(job);
    }
  }

  return unique;
}

function isRelevantBackendJob(job) {
  const text = [
    job.title,
    job.category,
    job.location,
    job.descriptionSnippet,
    job.tags?.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const requiredKeywords = [
    "backend",
    "back-end",
    "node",
    "node.js",
    "nodejs",
    "express",
    "api",
    "javascript",
    "software engineer",
    "web developer",
    "full stack",
    "full-stack",
    "fullstack",
    "mongodb",
    "mongoose",
    "rest",
  ];

  const excludedKeywords = [
    "office assistant",
    "sales",
    "writer",
    "marketing",
    "customer service",
    "crypto market specialist",
    "rater",
    "recruiter",
    "appointment setter",
    "bookkeeper",
    "executive assistant",
    "data entry",
    "virtual assistant",
    "firmware",
    "databricks",
    "rails engineer",
    "wordpress",
    "seo",
    "content writer",
    "social media",
    "medical",
    "nurse",
    "teacher",
    "therapist",
  ];

  const hasRequiredKeyword = requiredKeywords.some((keyword) =>
    text.includes(keyword)
  );

  const hasExcludedKeyword = excludedKeywords.some((keyword) =>
    text.includes(keyword)
  );

  return hasRequiredKeyword && !hasExcludedKeyword;
}

function scoreJobAgainstProfile(job, profile) {
  const {
    preferredRoles = "",
    preferredLocations = "",
    minimumScore = 80,
  } = profile || {};

  const roleList = preferredRoles
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const locationList = preferredLocations
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const haystack = [
    job.title,
    job.company,
    job.category,
    job.location,
    job.descriptionSnippet,
    (job.tags || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let score = 45;

  for (const role of roleList) {
    if (haystack.includes(role)) {
      score += 18;
      break;
    }
  }

  for (const location of locationList) {
    if (haystack.includes(location)) {
      score += 8;
      break;
    }
  }

  if (haystack.includes("backend")) score += 12;
  if (haystack.includes("node")) score += 10;
  if (haystack.includes("node.js")) score += 10;
  if (haystack.includes("nodejs")) score += 10;
  if (haystack.includes("express")) score += 8;
  if (haystack.includes("mongodb")) score += 8;
  if (haystack.includes("mongoose")) score += 6;
  if (haystack.includes("api")) score += 8;
  if (haystack.includes("rest")) score += 5;
  if (haystack.includes("aws")) score += 6;
  if (haystack.includes("javascript")) score += 5;
  if (haystack.includes("typescript")) score += 3;
  if (haystack.includes("postgres")) score += 3;
  if (haystack.includes("mysql")) score += 3;

  const blocker = /senior|staff|lead|principal|manager|director|architect/i.test(
    job.title
  );

  if (blocker) {
    score -= 25;
  }

  if (score > 100) score = 100;
  if (score < 1) score = 1;

  let status = "Saved for Review";
  let reason = "Below auto-apply threshold, saved for review.";

  if (blocker) {
    status = "Skipped";
    reason = "Qualification blocker detected from job seniority.";
  } else if (score >= Number(minimumScore || 80)) {
    status = "Auto Applied";
    reason = "Original resume appears strong enough for this role.";
  }

  return {
    score,
    status,
    reason,
    blocker,
  };
}

function matchesAnyQuery(job, queries) {
  if (!queries.length) return true;

  const text = [
    job.title,
    job.company,
    job.category,
    job.location,
    job.descriptionSnippet,
    (job.tags || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return queries.some((query) => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return words.every((word) => text.includes(word));
  });
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Fetch failed ${response.status}: ${raw.slice(0, 200)}`);
  }

  return response.json();
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`Fetch failed ${response.status}: ${raw.slice(0, 200)}`);
  }

  return response.text();
}

async function fetchRemotiveJobs({ queries, limit }) {
  const all = [];

  for (const query of queries) {
    const params = new URLSearchParams();
    params.set("category", "software-dev");
    params.set("search", query);
    params.set("limit", String(limit));

    const url = `${REMOTIVE_BASE_URL}?${params.toString()}`;

    try {
      const data = await fetchJson(url);
      const jobs = safeArray(data.jobs).map((job) => ({
        source: "Remotive",
        externalId: String(job.id || ""),
        title: job.title || "Untitled role",
        company: job.company_name || "Unknown company",
        location: job.candidate_required_location || "Remote",
        category: job.category || "",
        type: job.job_type || "not-specified",
        salary: job.salary || "Not specified",
        url: job.url || "",
        publicationDate: job.publication_date || "",
        descriptionSnippet: stripHtml(job.description || "").slice(0, 700),
        tags: [],
      }));

      all.push(...jobs);
    } catch (error) {
      console.log("Remotive query failed:", query, error.message);
    }
  }

  return all;
}

async function fetchWWRJobs() {
  try {
    const xml = await fetchText(WWR_RSS_URL);
    const parsed = await parseStringPromise(xml, { explicitArray: false });

    const items = safeArray(parsed?.rss?.channel?.item);

    return items.map((item, index) => ({
      source: "We Work Remotely",
      externalId: String(item.guid || item.link || index),
      title: item.title || "Untitled role",
      company: item["dc:creator"] || "Unknown company",
      location: "Remote",
      category: "Remote Jobs",
      type: "not-specified",
      salary: "Not specified",
      url: item.link || "",
      publicationDate: item.pubDate || "",
      descriptionSnippet: stripHtml(item.description || "").slice(0, 700),
      tags: [],
    }));
  } catch (error) {
    console.log("WWR fetch failed:", error.message);
    return [];
  }
}

async function fetchRemoteOkJobs() {
  try {
    const data = await fetchJson(REMOTEOK_JSON_URL, {
      "User-Agent": "Mozilla/5.0 DevCareerToolkit/1.0",
    });

    const rows = safeArray(data).filter((item) => item && item.id);

    return rows.map((job) => ({
      source: "Remote OK",
      externalId: String(job.id || ""),
      title: job.position || job.title || "Untitled role",
      company: job.company || "Unknown company",
      location: job.location || "Remote",
      category: Array.isArray(job.tags) ? job.tags.join(", ") : "Remote Jobs",
      type: job.employment_type || "not-specified",
      salary:
        job.salary_min || job.salary_max
          ? `${job.salary_min || "?"}-${job.salary_max || "?"}`
          : "Not specified",
      url: job.url ? `https://remoteok.com${job.url}` : "",
      publicationDate: job.date || "",
      descriptionSnippet: stripHtml(job.description || "").slice(0, 700),
      tags: Array.isArray(job.tags) ? job.tags : [],
    }));
  } catch (error) {
    console.log("RemoteOK fetch failed:", error.message);
    return [];
  }
}

async function upsertJob(jobData) {
  const existing = await Job.findOne({ url: jobData.url });

  if (existing) {
    existing.source = jobData.source;
    existing.externalId = jobData.externalId;
    existing.title = jobData.title;
    existing.company = jobData.company;
    existing.location = jobData.location;
    existing.category = jobData.category;
    existing.type = jobData.type;
    existing.salary = jobData.salary;
    existing.publicationDate = jobData.publicationDate;
    existing.descriptionSnippet = jobData.descriptionSnippet;
    existing.tags = jobData.tags || [];

    await existing.save();
    return existing;
  }

  return Job.create(jobData);
}

async function upsertMatchedJob({ searchProfileId, jobId, score, status, reason, blocker }) {
  const existing = await MatchedJob.findOne({
    searchProfile: searchProfileId,
    job: jobId,
  });

  if (existing) {
    existing.score = score;
    existing.status = status;
    existing.reason = reason;
    existing.blocker = blocker;
    existing.lastEvaluatedAt = new Date();

    await existing.save();
    return existing;
  }

  return MatchedJob.create({
    searchProfile: searchProfileId,
    job: jobId,
    score,
    status,
    reason,
    blocker,
    firstSeenAt: new Date(),
    lastEvaluatedAt: new Date(),
  });
}

async function saveSearchProfile(profileData) {
  const {
    profileName = "",
    profileEmail = "",
    profilePhone = "",
    profileLinkedIn = "",
    profileGitHub = "",
    resumeText = "",
    preferredRoles = "",
    preferredLocations = "",
    minimumScore = 80,
    remoteOnly = true,
    globalSearch = true,
    isSearchActive = false,
  } = profileData;

  let profile = null;

  if (profileEmail && profileEmail.trim()) {
    profile = await SearchProfile.findOne({ profileEmail: profileEmail.trim() });
  }

  if (!profile) {
    profile = await SearchProfile.create({
      profileName,
      profileEmail,
      profilePhone,
      profileLinkedIn,
      profileGitHub,
      resumeText,
      preferredRoles,
      preferredLocations,
      minimumScore,
      remoteOnly,
      globalSearch,
      isSearchActive,
      lastSearchedAt: null,
    });

    return profile;
  }

  profile.profileName = profileName;
  profile.profilePhone = profilePhone;
  profile.profileLinkedIn = profileLinkedIn;
  profile.profileGitHub = profileGitHub;
  profile.resumeText = resumeText;
  profile.preferredRoles = preferredRoles;
  profile.preferredLocations = preferredLocations;
  profile.minimumScore = minimumScore;
  profile.remoteOnly = remoteOnly;
  profile.globalSearch = globalSearch;
  profile.isSearchActive = isSearchActive;

  await profile.save();

  return profile;
}

async function searchRealJobs({
  search = "",
  limit = 12,
  profileName = "",
  profileEmail = "",
  profilePhone = "",
  profileLinkedIn = "",
  profileGitHub = "",
  resumeText = "",
  preferredRoles = "",
  preferredLocations = "",
  minimumScore = 80,
  remoteOnly = true,
  globalSearch = true,
  isSearchActive = false,
}) {
  const searchProfile = await saveSearchProfile({
    profileName,
    profileEmail,
    profilePhone,
    profileLinkedIn,
    profileGitHub,
    resumeText,
    preferredRoles,
    preferredLocations,
    minimumScore,
    remoteOnly,
    globalSearch,
    isSearchActive,
  });

  const queries = buildSearchQueries(search, preferredRoles);

  const [remotiveJobs, wwrJobs, remoteOkJobs] = await Promise.all([
    fetchRemotiveJobs({ queries, limit }),
    fetchWWRJobs(),
    fetchRemoteOkJobs(),
  ]);

  const collected = dedupeJobs([
    ...remotiveJobs,
    ...wwrJobs,
    ...remoteOkJobs,
  ]);

  const queryMatched = collected.filter((job) => matchesAnyQuery(job, queries));
  const relevantJobs = queryMatched.filter(isRelevantBackendJob);

  const processedJobs = [];

  for (const job of relevantJobs) {
    const savedJob = await upsertJob(job);

    const scoring = scoreJobAgainstProfile(job, {
      preferredRoles,
      preferredLocations,
      minimumScore,
    });

    await upsertMatchedJob({
      searchProfileId: searchProfile._id,
      jobId: savedJob._id,
      score: scoring.score,
      status: scoring.status,
      reason: scoring.reason,
      blocker: scoring.blocker,
    });

    processedJobs.push({
      dbJobId: savedJob._id,
      ...job,
      ...scoring,
    });
  }

  processedJobs.sort((a, b) => b.score - a.score);

  searchProfile.lastSearchedAt = new Date();
  await searchProfile.save();

  const limitedJobs = processedJobs.slice(0, Number(limit) || 12);

  const autoApplied = limitedJobs.filter((job) => job.status === "Auto Applied");
  const review = limitedJobs.filter((job) => job.status === "Saved for Review");
  const skipped = limitedJobs.filter((job) => job.status === "Skipped");

  return {
    searchProfileId: searchProfile._id,
    total: limitedJobs.length,
    autoApplied,
    review,
    skipped,
    jobs: limitedJobs,
    lastSearchedAt: searchProfile.lastSearchedAt,
  };
}

module.exports = {
  searchRealJobs,
  saveSearchProfile,
};
