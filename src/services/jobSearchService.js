const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api";

const KNOWN_SKILLS = [
  "node.js",
  "nodejs",
  "express",
  "express.js",
  "mongodb",
  "mongoose",
  "javascript",
  "typescript",
  "react",
  "next.js",
  "nextjs",
  "aws",
  "ec2",
  "nginx",
  "pm2",
  "rest api",
  "rest apis",
  "api",
  "jwt",
  "bcrypt",
  "docker",
  "kubernetes",
  "redis",
  "postgresql",
  "postgres",
  "mysql",
  "sql",
  "git",
  "github",
  "azure",
  "render",
  "vercel",
  "stripe",
  "openai",
  "debugging",
  "microservices",
  "cloud",
  "backend",
];

function normalizeText(value = "") {
  return String(value).toLowerCase();
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractSkillsFromResume(resumeText = "") {
  const text = normalizeText(resumeText);

  return uniqueArray(
    KNOWN_SKILLS.filter((skill) => text.includes(skill))
  );
}

function extractSkillsFromJob(job) {
  const sourceText = normalizeText(
    [
      job.title,
      job.description,
      job.category?.label,
      job.company?.display_name,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return uniqueArray(
    KNOWN_SKILLS.filter((skill) => sourceText.includes(skill))
  );
}

function parseCommaSeparated(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesPreferredLocation(jobLocation = "", preferredLocations = "") {
  const preferredList = parseCommaSeparated(preferredLocations).map((item) =>
    item.toLowerCase()
  );

  if (preferredList.length === 0) {
    return true;
  }

  const locationText = normalizeText(jobLocation);

  if (locationText.includes("remote")) {
    return true;
  }

  return preferredList.some((location) => {
    if (location === "worldwide") return true;
    return locationText.includes(location);
  });
}

function computeJobScore({
  job,
  resumeSkills,
  preferredRoles,
  preferredLocations,
  minimumScore,
  searchQuery,
}) {
  const title = normalizeText(job.title);
  const description = normalizeText(job.description);
  const location = normalizeText(job.location?.display_name || "");
  const fullJobText = `${title} ${description} ${location}`;

  const jobSkills = extractSkillsFromJob(job);
  const matchingSkills = resumeSkills.filter((skill) => jobSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !resumeSkills.includes(skill));

  let score = 0;

  const preferredRoleList = parseCommaSeparated(preferredRoles).map((role) =>
    role.toLowerCase()
  );

  if (preferredRoleList.length > 0) {
    const matchedRole = preferredRoleList.some((role) => title.includes(role));
    if (matchedRole) score += 25;
  }

  const searchTokens = parseCommaSeparated(searchQuery.replace(/\s+/g, ",")).map((token) =>
    token.toLowerCase()
  );

  if (searchTokens.length > 0) {
    const tokenMatches = searchTokens.filter((token) => fullJobText.includes(token)).length;
    score += Math.min(tokenMatches * 5, 20);
  }

  score += Math.min(matchingSkills.length * 10, 40);

  if (location.includes("remote")) {
    score += 10;
  }

  if (matchesPreferredLocation(job.location?.display_name || "", preferredLocations)) {
    score += 10;
  }

  if (title.includes("backend")) score += 5;
  if (title.includes("node")) score += 5;
  if (description.includes("api")) score += 5;
  if (description.includes("aws")) score += 5;
  if (description.includes("mongodb")) score += 5;
  if (description.includes("express")) score += 5;

  score = Math.min(score, 100);

  return {
    score,
    matchingSkills,
    missingSkills,
    passesMinimumScore: score >= Number(minimumScore || 0),
  };
}

function mapAdzunaJob(job, scoring) {
  return {
    id: job.id,
    title: job.title || "Untitled Role",
    company: job.company?.display_name || "Unknown Company",
    location: job.location?.display_name || "Unknown Location",
    url: job.redirect_url || "",
    description: job.description || "",
    snippet: job.description || "",
    category: job.category?.label || "",
    created: job.created || "",
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    matchScore: scoring.score,
    matchingSkills: scoring.matchingSkills,
    missingSkills: scoring.missingSkills,
  };
}

async function fetchAdzunaJobs({
  search,
  limit,
  preferredLocations,
  remoteOnly,
}) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || "us";

  if (!appId || !appKey) {
    throw new Error(
      "Missing ADZUNA_APP_ID or ADZUNA_APP_KEY in environment variables."
    );
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(limit || 10),
    what: search || "backend engineer node.js",
    "content-type": "application/json",
  });

  const preferredLocationList = parseCommaSeparated(preferredLocations);

  if (!remoteOnly && preferredLocationList.length > 0) {
    params.set("where", preferredLocationList[0]);
  }

  const url = `${ADZUNA_BASE_URL}/jobs/${country}/search/1?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "Failed to fetch jobs from Adzuna."
    );
  }

  return Array.isArray(data.results) ? data.results : [];
}

async function searchAndScoreJobs(payload) {
  const {
    search,
    limit,
    resumeText,
    preferredRoles,
    preferredLocations,
    minimumScore,
    remoteOnly,
  } = payload;

  const resumeSkills = extractSkillsFromResume(resumeText);
  const jobs = await fetchAdzunaJobs({
    search,
    limit,
    preferredLocations,
    remoteOnly,
  });

  const scoredJobs = jobs
    .map((job) => {
      const scoring = computeJobScore({
        job,
        resumeSkills,
        preferredRoles,
        preferredLocations,
        minimumScore,
        searchQuery: search,
      });

      return mapAdzunaJob(job, scoring);
    })
    .filter((job) => job.matchScore >= Number(minimumScore || 0))
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    totalFetched: jobs.length,
    totalReturned: scoredJobs.length,
    jobs: scoredJobs,
  };
}

module.exports = {
  searchAndScoreJobs,
};
