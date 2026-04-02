import axios from "axios";
import { JOB_SOURCE_TIMEOUT_MS } from "./serviceTimeouts.js";

const DEFAULT_LINKEDIN_LIMIT = 20;

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveString = (...values) => {
  const match = values.find((value) => String(value || "").trim());
  return match ? String(match).trim() : "";
};

const resolveSalary = (item) => {
  const directMin = toNumber(item?.salaryMin ?? item?.salary_min ?? item?.minSalary);
  const directMax = toNumber(item?.salaryMax ?? item?.salary_max ?? item?.maxSalary);
  const currency = resolveString(
    item?.salaryCurrency,
    item?.salary_currency,
    item?.currency,
    item?.salary?.currency
  );

  if (directMin !== null || directMax !== null) {
    return {
      salaryMin: directMin,
      salaryMax: directMax,
      salaryCurrency: currency,
    };
  }

  const salaryText = resolveString(item?.salary, item?.salaryText, item?.compensation);
  const matches = salaryText.match(/(\d[\d,]*)/g) || [];

  if (!matches.length) {
    return {
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: currency,
    };
  }

  const parsed = matches
    .map((value) => Number(String(value).replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));

  return {
    salaryMin: parsed[0] ?? null,
    salaryMax: parsed[1] ?? parsed[0] ?? null,
    salaryCurrency: currency,
  };
};

const normalizeLinkedInApifyItem = (item = {}) => {
  const title = resolveString(item?.title, item?.positionTitle, item?.jobTitle);
  const company = resolveString(item?.companyName, item?.company, item?.companyTitle);
  const location = resolveString(item?.location, item?.formattedLocation, item?.jobLocation);
  const description = resolveString(
    item?.description,
    item?.descriptionText,
    item?.jobDescription,
    item?.jobSummary
  );
  const applyUrl = resolveString(
    item?.applyUrl,
    item?.jobUrl,
    item?.url,
    item?.link,
    item?.jobPostingUrl
  );
  const jobId = resolveString(item?.jobId, item?.id, applyUrl, `${company}-${title}`);
  const easyApplyAvailable = Boolean(
    item?.easyApply ??
      item?.isEasyApply ??
      item?.easy_apply ??
      item?.easyApplyEnabled ??
      String(item?.applicationType || "").toLowerCase().includes("easy")
  );

  return {
    jobId: `linkedin:${jobId}`,
    title,
    company,
    location,
    description,
    applyUrl,
    easyApplyAvailable,
    postedAt: item?.postedAt || item?.postedDate || item?.datePosted || null,
    ...resolveSalary(item),
    rawJobData: item,
  };
};

export const fetchLinkedInJobsViaApify = async ({
  search,
  location = "",
  limit = DEFAULT_LINKEDIN_LIMIT,
}) => {
  const token = String(process.env.APIFY_TOKEN || "").trim();
  const actorId = String(process.env.APIFY_LINKEDIN_ACTOR_ID || "").trim();

  if (!token || !actorId) {
    return {
      jobs: [],
      skipped: true,
      reason: "LinkedIn Apify integration is not configured.",
    };
  }

  const maxItems = Math.min(Math.max(Number(limit) || DEFAULT_LINKEDIN_LIMIT, 1), 50);
  const actorInput = {
    keywords: String(search || "").trim(),
    keyword: String(search || "").trim(),
    title: String(search || "").trim(),
    location: String(location || "").trim(),
    locations: String(location || "").trim() ? [String(location).trim()] : [],
    maxItems,
    count: maxItems,
    rows: maxItems,
    proxyConfiguration: {
      useApifyProxy: true,
    },
  };

  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`;
  const response = await axios.post(url, actorInput, {
    params: {
      token,
      format: "json",
      clean: true,
    },
    timeout: JOB_SOURCE_TIMEOUT_MS,
  });

  const items = Array.isArray(response.data) ? response.data : [];
  const jobs = items
    .map(normalizeLinkedInApifyItem)
    .filter((item) => item.jobId && item.title && item.applyUrl);

  return {
    jobs,
    skipped: false,
    reason: "",
  };
};
