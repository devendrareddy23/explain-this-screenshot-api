import axios from "axios";
import Job from "../models/Job.js";
import User from "../models/User.js";
import UserPreference from "../models/UserPreference.js";
import Application from "../models/Application.js";
import { getJobSourceMetadata } from "./jobSourceMetadataService.js";
import { createRecruiterOutreachForJob } from "./recruiterOutreachService.js";
import { scoreJobMatch } from "./jobMatchScoringService.js";
import { sendNearLimitAlertIfNeeded, sendPerfectMatchAlerts } from "./notificationAutomationService.js";
import { JOB_SOURCE_TIMEOUT_MS } from "./serviceTimeouts.js";
import { aggregateJobsFromSources } from "./jobSources/jobAggregator.js";

const RECRUITER_OUTREACH_ENABLED = process.env.ENABLE_RECRUITER_OUTREACH === "true";
const DEFAULT_FALLBACK_KEYWORDS = [
  "software engineer",
  "developer",
  "backend engineer",
  "node.js developer",
];
const DEFAULT_COUNTRY = "in";

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
    timeout: JOB_SOURCE_TIMEOUT_MS,
  });

  const results = Array.isArray(response.data?.results) ? response.data.results : [];
  console.log("Searching Adzuna...");
  console.log("Keywords:", term);
  console.log("Location:", location || "any");
  console.log("Country:", country);
  console.log("Results:", results.length);

  return results;
};

const resolveLocation = (job) => {
  if (job?.location?.display_name) {
    return String(job.location.display_name);
  }

  if (Array.isArray(job?.location?.area) && job.location.area.length) {
    return job.location.area.filter(Boolean).join(", ");
  }

  return "";
};

const resolveCompany = (job) => {
  if (job?.company?.display_name) {
    return String(job.company.display_name);
  }

  return "";
};

const resolveSalaryCurrency = (job, country) => {
  if (job?.salary_currency) {
    return String(job.salary_currency);
  }

  const normalizedCountry = String(country || "").trim().toLowerCase();

  if (normalizedCountry === "us") return "USD";
  if (normalizedCountry === "gb") return "GBP";
  if (normalizedCountry === "in") return "INR";

  return "";
};

const normalizeAdzunaJob = ({
  job,
  profileEmail,
  safeCountry,
  normalizedWorkTypes,
  preferredRoles = [],
  preferredLocations = [],
  workTypes = [],
  expectedSalaryMin = null,
  companySizePreference = "any",
  resumeText = "",
  careerDna = null,
}) => {
  const title = String(job?.title || "").trim();
  const description = String(job?.description || "").trim();
  const company = resolveCompany(job);
  const location = resolveLocation(job);
  const applyUrl = String(job?.redirect_url || "").trim();
  const sourceUrl = applyUrl;
  const remote = looksRemote({
    ...job,
    title,
    description,
    location: { display_name: location },
  });
  const locationText = location.toLowerCase();
  const sourceMetadata = getJobSourceMetadata("Adzuna");
  const source = sourceMetadata.source;
  const autoApplySupported = sourceMetadata.autoApplySupported;
  const searchSupported = true;
  const shortlistSupported = true;

  const matchesWorkType =
    normalizedWorkTypes.length === 0 ||
    normalizedWorkTypes.includes("remote") && remote ||
    normalizedWorkTypes.includes("hybrid") && locationText.includes("hybrid") ||
    normalizedWorkTypes.includes("onsite") && !remote;

  const weightedScore = scoreJobMatch({
    job: {
      title,
      description,
      location,
      remote,
      salaryMin: typeof job?.salary_min === "number" ? job.salary_min : null,
      salaryMax: typeof job?.salary_max === "number" ? job.salary_max : null,
    },
    preferredRoles,
    preferredLocations,
    workTypes,
    expectedSalaryMin,
    companySizePreference,
    resumeText,
    careerDna,
  });

  const reasons = [
    weightedScore.breakdown.skills.note,
    weightedScore.breakdown.experience.note,
    weightedScore.breakdown.location.note,
    weightedScore.breakdown.salary.note,
    weightedScore.breakdown.companySize.note,
  ].filter(Boolean);

  return {
    jobId: String(job?.id || ""),
    profileEmail,
    title,
    company,
    location,
    description,
    jobUrl: applyUrl,
    applyUrl,
    source,
    sourceUrl,
    country: safeCountry,
    remote,
    employmentType: String(job?.contract_type || job?.contract_time || "").trim(),
    salaryMin: typeof job?.salary_min === "number" ? job.salary_min : null,
    salaryMax: typeof job?.salary_max === "number" ? job.salary_max : null,
    salaryCurrency: resolveSalaryCurrency(job, safeCountry),
    score: weightedScore.score100,
    matchScore: weightedScore.score100,
    aiScore10: weightedScore.score10,
    aiMatchLabel: weightedScore.label,
    aiScoreReason: reasons.join(" "),
    aiScoreBreakdown: weightedScore.breakdown,
    reasons,
    shortlisted: weightedScore.shouldShowToUser,
    workflowState: weightedScore.shouldShowToUser ? "shortlisted" : "scored",
    workflowTimeline: [
      {
        status: "found",
        label: "Job Found",
        note: "Fetched from supported search source.",
        at: new Date(),
      },
      {
        status: weightedScore.shouldShowToUser ? "shortlisted" : "scored",
        label: weightedScore.shouldShowToUser ? "Shortlisted" : "Scored",
        note:
          weightedScore.shouldShowToUser
            ? `${weightedScore.label} based on weighted scoring.`
            : "Weak match filtered below user-facing threshold.",
        at: new Date(),
      },
    ],
    manualActionNeeded: sourceMetadata.manualActionRequired,
    manualActionRequired: sourceMetadata.manualActionRequired,
    manualActionReason: sourceMetadata.manualActionReason,
    sourceCapabilities: {
      searchSupported,
      shortlistSupported,
      autoApplySupported,
    },
    rawJobData: job,
    _matchesWorkType: matchesWorkType,
  };
};

const normalizeLinkedInJob = ({
  job,
  profileEmail,
  safeCountry,
  normalizedWorkTypes,
  preferredRoles = [],
  preferredLocations = [],
  workTypes = [],
  expectedSalaryMin = null,
  companySizePreference = "any",
  resumeText = "",
  careerDna = null,
}) => {
  const title = String(job?.title || "").trim();
  const description = String(job?.description || "").trim();
  const company = String(job?.company || "").trim();
  const location = String(job?.location || "").trim();
  const applyUrl = String(job?.applyUrl || "").trim();
  const remote = `${title} ${location} ${description}`.toLowerCase().includes("remote");
  const locationText = location.toLowerCase();
  const sourceMetadata = getJobSourceMetadata("LinkedIn");
  const easyApplyAvailable = Boolean(job?.easyApplyAvailable);

  const matchesWorkType =
    normalizedWorkTypes.length === 0 ||
    normalizedWorkTypes.includes("remote") && remote ||
    normalizedWorkTypes.includes("hybrid") && locationText.includes("hybrid") ||
    normalizedWorkTypes.includes("onsite") && !remote;

  const weightedScore = scoreJobMatch({
    job: {
      title,
      description,
      location,
      remote,
      salaryMin: typeof job?.salaryMin === "number" ? job.salaryMin : null,
      salaryMax: typeof job?.salaryMax === "number" ? job.salaryMax : null,
    },
    preferredRoles,
    preferredLocations,
    workTypes,
    expectedSalaryMin,
    companySizePreference,
    resumeText,
    careerDna,
  });

  const reasons = [
    weightedScore.breakdown.skills.note,
    weightedScore.breakdown.experience.note,
    weightedScore.breakdown.location.note,
    weightedScore.breakdown.salary.note,
    weightedScore.breakdown.companySize.note,
  ].filter(Boolean);

  const easyApplyNote = easyApplyAvailable
    ? "LinkedIn Easy Apply detected, but final submission must still be completed manually in-browser."
    : sourceMetadata.manualActionReason;

  return {
    jobId: String(job?.jobId || ""),
    profileEmail,
    title,
    company,
    location,
    description,
    jobUrl: applyUrl,
    applyUrl,
    source: sourceMetadata.source,
    sourceUrl: applyUrl,
    country: safeCountry,
    remote,
    employmentType: "",
    salaryMin: typeof job?.salaryMin === "number" ? job.salaryMin : null,
    salaryMax: typeof job?.salaryMax === "number" ? job.salaryMax : null,
    salaryCurrency: String(job?.salaryCurrency || "").trim(),
    score: weightedScore.score100,
    matchScore: weightedScore.score100,
    aiScore10: weightedScore.score10,
    aiMatchLabel: weightedScore.label,
    aiScoreReason: reasons.join(" "),
    aiScoreBreakdown: weightedScore.breakdown,
    reasons,
    shortlisted: weightedScore.shouldShowToUser,
    workflowState: weightedScore.shouldShowToUser ? "shortlisted" : "scored",
    workflowTimeline: [
      {
        status: "found",
        label: "Job Found",
        note: easyApplyAvailable
          ? "Imported from LinkedIn source feed with Easy Apply availability detected."
          : "Imported from LinkedIn source feed.",
        at: new Date(),
      },
      {
        status: weightedScore.shouldShowToUser ? "shortlisted" : "scored",
        label: weightedScore.shouldShowToUser ? "Shortlisted" : "Scored",
        note:
          weightedScore.shouldShowToUser
            ? `${weightedScore.label} based on weighted scoring.`
            : "Weak match filtered below user-facing threshold.",
        at: new Date(),
      },
    ],
    manualActionNeeded: true,
    manualActionRequired: true,
    manualActionReason: easyApplyNote,
    sourceCapabilities: {
      searchSupported: true,
      shortlistSupported: true,
      autoApplySupported: false,
    },
    notes: easyApplyAvailable ? "LinkedIn Easy Apply available for manual completion." : "",
    rawJobData: {
      ...(job?.rawJobData || {}),
      easyApplyAvailable,
    },
    _matchesWorkType: matchesWorkType,
  };
};

const normalizeAggregatedJob = ({
  job,
  profileEmail,
  safeCountry,
  normalizedWorkTypes,
  preferredRoles = [],
  preferredLocations = [],
  workTypes = [],
  expectedSalaryMin = null,
  companySizePreference = "any",
  resumeText = "",
  careerDna = null,
}) => {
  const sourceMetadata = getJobSourceMetadata(job?.source || "");
  const title = String(job?.title || "").trim();
  const company = String(job?.company || "").trim();
  const location = String(job?.location || "").trim();
  const description = String(job?.description || "").trim();
  const applyUrl = String(job?.applyUrl || job?.jobUrl || "").trim();
  const workType = String(job?.workType || "").trim().toLowerCase();
  const remote = workType === "remote" || `${title} ${location} ${description}`.toLowerCase().includes("remote");
  const locationText = location.toLowerCase();

  const matchesWorkType =
    normalizedWorkTypes.length === 0 ||
    normalizedWorkTypes.includes("remote") && remote ||
    normalizedWorkTypes.includes("hybrid") && (workType === "hybrid" || locationText.includes("hybrid")) ||
    normalizedWorkTypes.includes("onsite") && !remote;

  const weightedScore = scoreJobMatch({
    job: {
      title,
      description,
      location,
      remote,
      salaryMin: typeof job?.salaryMin === "number" ? job.salaryMin : null,
      salaryMax: typeof job?.salaryMax === "number" ? job.salaryMax : null,
    },
    preferredRoles,
    preferredLocations,
    workTypes,
    expectedSalaryMin,
    companySizePreference,
    resumeText,
    careerDna,
  });

  const reasons = [
    weightedScore.breakdown.skills.note,
    weightedScore.breakdown.experience.note,
    weightedScore.breakdown.location.note,
    weightedScore.breakdown.salary.note,
    weightedScore.breakdown.companySize.note,
  ].filter(Boolean);

  return {
    jobId: String(job?.sourceId || applyUrl || `${title}:${company}`).trim(),
    profileEmail,
    title,
    company,
    location,
    description,
    jobUrl: applyUrl,
    applyUrl,
    source: sourceMetadata.source,
    sourceUrl: applyUrl,
    country: safeCountry,
    remote,
    employmentType: String(job?.workType || "").trim(),
    salaryMin: typeof job?.salaryMin === "number" ? job.salaryMin : null,
    salaryMax: typeof job?.salaryMax === "number" ? job.salaryMax : null,
    salaryCurrency: String(job?.salaryCurrency || "").trim(),
    score: weightedScore.score100,
    matchScore: weightedScore.score100,
    aiScore10: weightedScore.score10,
    aiMatchLabel: weightedScore.label,
    aiScoreReason: reasons.join(" "),
    aiScoreBreakdown: weightedScore.breakdown,
    reasons,
    shortlisted: weightedScore.shouldShowToUser,
    workflowState: weightedScore.shouldShowToUser ? "shortlisted" : "scored",
    workflowTimeline: [
      {
        status: "found",
        label: "Job Found",
        note: `Imported from ${sourceMetadata.source}.`,
        at: new Date(),
      },
      {
        status: weightedScore.shouldShowToUser ? "shortlisted" : "scored",
        label: weightedScore.shouldShowToUser ? "Shortlisted" : "Scored",
        note:
          weightedScore.shouldShowToUser
            ? `${weightedScore.label} based on weighted scoring.`
            : "Weak match filtered below user-facing threshold.",
        at: new Date(),
      },
    ],
    manualActionNeeded: true,
    manualActionRequired: true,
    manualActionReason: sourceMetadata.manualActionReason,
    sourceCapabilities: {
      searchSupported: true,
      shortlistSupported: true,
      autoApplySupported: false,
    },
    rawJobData: job?.rawJobData || job,
    _matchesWorkType: matchesWorkType,
  };
};

export const searchScoreAndStoreJobs = async ({
  search,
  location = "",
  country = "in",
  remoteOnly = false,
  workTypes = [],
  profileEmail,
  limit = 20,
  minimumScore = 0,
  expectedSalaryMin = null,
  companySizePreference = "any",
  preferredRoles = [],
  preferredLocations = [],
  careerDna = null,
  excludedJobIds = [],
}) => {
  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY || process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      console.error("Adzuna credentials missing!");
      throw new Error("Missing Adzuna credentials");
    }

    if (!profileEmail) {
      throw new Error("Missing profile email");
    }

    const safeCountry = String(country || DEFAULT_COUNTRY).trim().toLowerCase();
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

    if (allJobs.length === 0 && safeLocation) {
      console.log("No Adzuna results with location filter. Retrying without location.");

      for (const term of searchTerms) {
        try {
          const jobs = await fetchAdzunaJobsForTerm({
            term,
            country: safeCountry,
            location: "",
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

          console.error(`Adzuna fallback fetch failed for term "${term}":`, message);
          failedTerms.push({ term: `${term}:fallback`, message });
        }
      }
    }

    const uniqueJobsMap = new Map();

    for (const job of allJobs) {
      if (!job?.id) continue;
      uniqueJobsMap.set(String(job.id), job);
    }

    const uniqueJobs = Array.from(uniqueJobsMap.values());

    const normalizedWorkTypes = Array.isArray(workTypes)
      ? workTypes.map((item) => String(item).trim().toLowerCase())
      : [];

    const userForScoring = await User.findOne({ email: profileEmail }).select("_id masterResumeText email plan");
    const resumeText = String(userForScoring?.masterResumeText || "").trim();

    const processedJobs = uniqueJobs.map((job) =>
      normalizeAdzunaJob({
        job,
        profileEmail,
        safeCountry,
        normalizedWorkTypes,
        preferredRoles,
        preferredLocations,
        workTypes,
        expectedSalaryMin,
        companySizePreference,
        resumeText,
        careerDna,
      })
    );

    try {
      const aggregatedResult = await aggregateJobsFromSources({
        keywords: search,
        location: safeLocation,
        country: safeCountry,
        limit: safeLimit,
      });

      const aggregatedProcessed = (aggregatedResult.jobs || []).map((job) =>
        (String(job?.source || "").trim().toLowerCase() === "linkedin"
          ? normalizeLinkedInJob({
              job,
              profileEmail,
              safeCountry,
              normalizedWorkTypes,
              preferredRoles,
              preferredLocations,
              workTypes,
              expectedSalaryMin,
              companySizePreference,
              resumeText,
              careerDna,
            })
          : normalizeAggregatedJob({
              job,
              profileEmail,
              safeCountry,
              normalizedWorkTypes,
              preferredRoles,
              preferredLocations,
              workTypes,
              expectedSalaryMin,
              companySizePreference,
              resumeText,
              careerDna,
            }))
      );

      processedJobs.push(...aggregatedProcessed);
      failedTerms.push(...(Array.isArray(aggregatedResult.failedSources) ? aggregatedResult.failedSources : []).map((item) => ({
        term: String(item?.source || "source").toLowerCase(),
        message: item?.message || "Source failed.",
      })));
    } catch (error) {
      failedTerms.push({
        term: "aggregator",
        message: error.response?.data?.message || error.message || "Additional source aggregation failed.",
      });
    }

    const excludedIds = new Set(
      (Array.isArray(excludedJobIds) ? excludedJobIds : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );

    const filteredJobs = processedJobs.filter((job) => {
      if (!job.jobId || !job.title) return false;
      if (Number(job.score || job.matchScore || 0) < Math.max(Number(minimumScore || 80), 80)) return false;
      if (remoteOnly && !job.remote) return false;
      if (!job._matchesWorkType) return false;
      if (excludedIds.has(String(job.jobId || "").trim())) return false;
      return true;
    }).map(({ _matchesWorkType, ...job }) => job);

    const dedupedFilteredJobs = [];
    const seenJobKeys = new Set();

    for (const job of filteredJobs) {
      const dedupeKey = String(job.jobId || "").trim()
        ? `${String(job.source || "").trim().toLowerCase()}::${String(job.jobId || "").trim()}`
        : `${String(job.title || "").trim().toLowerCase()}::${String(job.company || "").trim().toLowerCase()}`;

      if (seenJobKeys.has(dedupeKey)) {
        continue;
      }

      seenJobKeys.add(dedupeKey);
      dedupedFilteredJobs.push(job);
    }

    dedupedFilteredJobs.sort((a, b) => b.score - a.score);

    const existingApplications = await Application.find({ profileEmail })
      .select("jobId appliedAt user")
      .lean();
    const applicationByJobId = new Map(
      existingApplications
        .filter((item) => String(item.jobId || "").trim())
        .map((item) => [String(item.jobId || "").trim(), item])
    );
    const hydratedJobs = dedupedFilteredJobs.map((job) => {
      const existingApplication = applicationByJobId.get(String(job.jobId || "").trim());

      if (!existingApplication) {
        return job;
      }

      return {
        ...job,
        applied: true,
        appliedAt: existingApplication.appliedAt || new Date(),
        appliedByUserId: existingApplication.user || null,
        manualActionNeeded: false,
      };
    });

    await Job.deleteMany({ profileEmail });

    if (hydratedJobs.length === 0) {
      return {
        success: true,
        totalFetched: allJobs.length,
        totalFinal: 0,
        jobs: [],
        failedTerms,
      };
    }

    const savedJobs = await Job.insertMany(hydratedJobs, { ordered: false });

    const user =
      userForScoring?._id
        ? userForScoring
        : await User.findOne({ email: profileEmail }).select("_id email plan");

    if (user?._id && RECRUITER_OUTREACH_ENABLED) {
      await Promise.allSettled(
        savedJobs.slice(0, 8).map((job) =>
          createRecruiterOutreachForJob({
            job,
            userId: user._id,
            profileEmail,
          })
        )
      );
    }

    if (user?._id) {
      await Promise.allSettled([
        sendPerfectMatchAlerts({ user, jobs: savedJobs }),
        sendNearLimitAlertIfNeeded({ user }),
      ]);
    }

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

export async function populateJobQueueForUser({ userId, profileEmail }) {
  const normalizedEmail = String(profileEmail || "").trim().toLowerCase();

  if (!userId || !normalizedEmail) {
    return {
      success: false,
      message: "User id and email are required to populate the job queue.",
      jobs: [],
    };
  }

  const [user, preference] = await Promise.all([
    User.findById(userId).select("_id email"),
    UserPreference.findOne({ user: userId }).lean(),
  ]);

  const preferredRoles = Array.isArray(preference?.preferredRoles) ? preference.preferredRoles : [];
  const preferredLocations = Array.isArray(preference?.preferredLocations) ? preference.preferredLocations : [];
  const workTypes = Array.isArray(preference?.workTypes) && preference.workTypes.length
    ? preference.workTypes
    : ["remote"];

  return searchScoreAndStoreJobs({
    search: preferredRoles.length ? preferredRoles.join(", ") : DEFAULT_FALLBACK_KEYWORDS.join(", "),
    location: preferredLocations.join(", "),
    country: String(preference?.country || DEFAULT_COUNTRY).trim().toLowerCase(),
    remoteOnly: workTypes.length === 1 && workTypes[0] === "remote",
    workTypes,
    profileEmail: normalizedEmail || String(user?.email || "").trim().toLowerCase(),
    minimumScore: Number(preference?.minimumMatchScore) || 80,
    expectedSalaryMin: preference?.expectedSalaryMin ?? null,
    companySizePreference: preference?.companySizePreference || "any",
    preferredRoles: preferredRoles.length ? preferredRoles : DEFAULT_FALLBACK_KEYWORDS,
    preferredLocations,
    careerDna: preference?.careerDna || null,
    excludedJobIds: [],
  });
}
