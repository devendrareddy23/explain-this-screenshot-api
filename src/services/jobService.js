const REMOTIVE_BASE_URL = "https://remotive.com/api/remote-jobs";

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  ]
    .join(" ")
    .toLowerCase();

  let score = 55;

  for (const role of roleList) {
    if (haystack.includes(role)) {
      score += 12;
      break;
    }
  }

  for (const location of locationList) {
    if (haystack.includes(location)) {
      score += 8;
      break;
    }
  }

  if (haystack.includes("node")) score += 6;
  if (haystack.includes("express")) score += 4;
  if (haystack.includes("mongodb")) score += 4;
  if (haystack.includes("api")) score += 4;
  if (haystack.includes("backend")) score += 5;
  if (haystack.includes("aws")) score += 4;
  if (haystack.includes("javascript")) score += 3;

  if (/senior|staff|lead|principal/i.test(job.title)) {
    score -= 18;
  }

  if (score > 100) score = 100;
  if (score < 1) score = 1;

  const blocker = /senior|staff|lead|principal/i.test(job.title);

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

async function searchRealJobs({
  search = "",
  limit = 12,
  category = "software-dev",
  preferredRoles = "",
  preferredLocations = "",
  minimumScore = 80,
}) {
  const params = new URLSearchParams();

  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (limit) params.set("limit", String(limit));

  const response = await fetch(`${REMOTIVE_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch jobs from Remotive.");
  }

  const data = await response.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  const normalizedJobs = jobs.map((job) => {
    const descriptionSnippet = stripHtml(job.description || "").slice(0, 500);

    const normalized = {
      id: job.id,
      source: "Remotive",
      title: job.title || "Untitled role",
      company: job.company_name || "Unknown company",
      location: job.candidate_required_location || "Remote",
      category: job.category || "",
      type: job.job_type || "not-specified",
      salary: job.salary || "Not specified",
      url: job.url || "",
      publicationDate: job.publication_date || "",
      descriptionSnippet,
    };

    const scoring = scoreJobAgainstProfile(normalized, {
      preferredRoles,
      preferredLocations,
      minimumScore,
    });

    return {
      ...normalized,
      ...scoring,
    };
  });

  const autoApplied = normalizedJobs.filter((job) => job.status === "Auto Applied");
  const review = normalizedJobs.filter((job) => job.status === "Saved for Review");
  const skipped = normalizedJobs.filter((job) => job.status === "Skipped");

  return {
    total: normalizedJobs.length,
    autoApplied,
    review,
    skipped,
    jobs: normalizedJobs,
  };
}

module.exports = {
  searchRealJobs,
};
