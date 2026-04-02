const axios = require("axios");
const AutoHuntJob = require("../models/AutoHuntJob");
const JOB_SOURCE_TIMEOUT_MS = 20000;

const normalizeText = (value = "") => String(value).toLowerCase().trim();

const extractSkillsFromResume = (resumeText = "") => {
  const skillBank = [
    "node.js",
    "nodejs",
    "express",
    "express.js",
    "mongodb",
    "mongoose",
    "javascript",
    "typescript",
    "aws",
    "ec2",
    "nginx",
    "pm2",
    "rest api",
    "restful api",
    "jwt",
    "bcrypt",
    "git",
    "github",
    "docker",
    "redis",
    "mysql",
    "postgresql",
    "sql",
    "react",
    "azure",
    "api",
    "backend",
  ];

  const lowerResume = normalizeText(resumeText);
  return skillBank.filter((skill) => lowerResume.includes(skill));
};

const isRelevantNodeJob = (job) => {
  const title = normalizeText(job.title || "");
  const description = normalizeText(job.description || "");
  const text = `${title} ${description}`;

  const mustHaveSignals = [
    "node.js",
    "nodejs",
    "express",
    "express.js",
    "javascript",
    "backend",
    "api",
  ];

  const badSignals = [
    "java developer",
    "python developer",
    "python backend",
    "c#",
    "golang",
    "go developer",
    "spring boot",
    "core java",
    "fastapi",
    "django",
    "php developer",
    "laravel",
    "ui developer",
    "frontend developer",
    "react developer",
    "angular developer",
    "head of engineering",
    "principal",
    "architect",
  ];

  const hasMustHave = mustHaveSignals.some((signal) => text.includes(signal));
  const hasBadSignal = badSignals.some((signal) => text.includes(signal));

  return hasMustHave && !hasBadSignal;
};

const getExperiencePenalty = (job) => {
  const text = normalizeText(`${job.title || ""} ${job.description || ""}`);

  if (
    text.includes("8 to 17 years") ||
    text.includes("8-17 years") ||
    text.includes("10+ years") ||
    text.includes("12+ years")
  ) {
    return 30;
  }

  if (
    text.includes("7+ years") ||
    text.includes("8+ years") ||
    text.includes("9+ years")
  ) {
    return 20;
  }

  if (
    text.includes("5-10 years") ||
    text.includes("6-9 years") ||
    text.includes("5+ years") ||
    text.includes("6+ years")
  ) {
    return 12;
  }

  if (
    text.includes("4-6 years") ||
    text.includes("4+ years") ||
    text.includes("4 years")
  ) {
    return 6;
  }

  return 0;
};

const calculateJobScore = (job, profile) => {
  const resumeSkills = extractSkillsFromResume(profile.resumeText);

  const title = normalizeText(job.title || "");
  const description = normalizeText(job.description || "");
  const company = normalizeText(job.company?.display_name || "");
  const location = normalizeText(job.location?.display_name || "");

  const searchableText = `${title} ${description} ${company} ${location}`;

  const matchedSkills = resumeSkills.filter((skill) =>
    searchableText.includes(skill)
  );

  const missingSkills = resumeSkills.filter(
    (skill) => !searchableText.includes(skill)
  );

  let score = 0;

  score += matchedSkills.length * 8;

  const preferredRoles = (profile.preferredRoles || []).map((role) =>
    normalizeText(role)
  );

  for (const role of preferredRoles) {
    const roleWords = role.split(/\s+/).filter(Boolean);

    if (searchableText.includes(role)) {
      score += 20;
      break;
    }

    const matchedWordCount = roleWords.filter((word) =>
      searchableText.includes(word)
    ).length;

    if (matchedWordCount >= 2) {
      score += 12;
      break;
    }

    if (matchedWordCount >= 1) {
      score += 6;
    }
  }

  const nodeSignals = [
    "node.js",
    "nodejs",
    "express",
    "express.js",
    "javascript",
    "mongodb",
    "mongoose",
    "rest api",
    "restful api",
    "backend",
    "api",
  ];

  const nodeSignalMatches = nodeSignals.filter((signal) =>
    searchableText.includes(signal)
  ).length;

  score += Math.min(nodeSignalMatches * 4, 24);

  const preferredLocations = (profile.preferredLocations || []).map((loc) =>
    normalizeText(loc)
  );

  const matchedLocation = preferredLocations.some((loc) =>
    location.includes(loc)
  );

  if (matchedLocation) {
    score += 10;
  }

  const remoteSignals = ["remote", "work from home", "wfh", "hybrid"];
  const hasRemoteSignal = remoteSignals.some((signal) =>
    searchableText.includes(signal)
  );

  if (profile.remoteOnly) {
    if (hasRemoteSignal) {
      score += 10;
    } else {
      score -= 10;
    }
  } else if (hasRemoteSignal) {
    score += 5;
  }

  if (title.includes("senior")) score -= 10;
  if (title.includes("lead")) score -= 15;
  if (title.includes("principal")) score -= 20;
  if (title.includes("head")) score -= 25;
  if (title.includes("manager")) score -= 20;
  if (title.includes("architect")) score -= 20;

  score -= getExperiencePenalty(job);

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    score,
    matchedSkills,
    missingSkills,
  };
};

const fetchIndiaJobsFromAdzuna = async ({
  search = "node.js developer",
  page = 1,
}) => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error("Missing Adzuna API credentials.");
  }

  const encodedSearch = encodeURIComponent(search);

  const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${encodedSearch}&where=India&content-type=application/json`;

  const response = await axios.get(url, {
    timeout: JOB_SOURCE_TIMEOUT_MS,
  });

  return response.data.results || [];
};

const runIndiaAutoHunt = async (profile) => {
  const roleQueries = [
    "Node.js Developer",
    "Backend Developer Node.js",
    "Express Developer",
    "JavaScript Backend Developer",
    "Node Backend Developer",
    "MERN Backend Developer",
  ];

  const allSavedJobs = [];

  for (const role of roleQueries) {
    const jobs = await fetchIndiaJobsFromAdzuna({ search: role, page: 1 });

    console.log(`Auto Hunt query: ${role} | jobs found: ${jobs.length}`);

    for (const job of jobs) {
      if (!isRelevantNodeJob(job)) {
        console.log(`Skipped irrelevant job: ${job.title || "No title"}`);
        continue;
      }

      const { score, matchedSkills, missingSkills } = calculateJobScore(
        job,
        profile
      );

      console.log(
        `Checking job: ${job.title || "No title"} | score: ${score} | company: ${
          job.company?.display_name || "Unknown"
        }`
      );

      if (score < profile.minimumScore) {
        continue;
      }

      try {
        const savedJob = await AutoHuntJob.findOneAndUpdate(
          {
            profileEmail: profile.profileEmail.toLowerCase(),
            jobId: String(job.id),
          },
          {
            profileEmail: profile.profileEmail.toLowerCase(),
            jobId: String(job.id),
            title: job.title || "",
            company: job.company?.display_name || "",
            location: job.location?.display_name || "",
            description: job.description || "",
            redirectUrl: job.redirect_url || "",
            source: "adzuna",
            salaryMin: job.salary_min || null,
            salaryMax: job.salary_max || null,
            score,
            matchedSkills,
            missingSkills,
            rawJob: job,
            dismissed: false,
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );

        allSavedJobs.push(savedJob);
      } catch (error) {
        if (error.code !== 11000) {
          console.error("Failed to save auto-hunt job:", error.message);
        }
      }
    }
  }

  return allSavedJobs;
};

module.exports = {
  runIndiaAutoHunt,
};
