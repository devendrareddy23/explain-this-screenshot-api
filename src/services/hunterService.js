import axios from "axios";

const KNOWN_JOB_BOARD_HOSTS = [
  "adzuna.com",
  "linkedin.com",
  "indeed.com",
  "naukri.com",
  "wellfound.com",
  "weworkremotely.com",
];

const normalizeDomain = (domain = "") => {
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
};

export const extractCompanyDomain = (job) => {
  const candidates = [job?.sourceUrl, job?.applyUrl, job?.jobUrl];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      const domain = normalizeDomain(url.hostname);

      if (!domain || KNOWN_JOB_BOARD_HOSTS.some((host) => domain.endsWith(host))) {
        continue;
      }

      return domain;
    } catch {
      continue;
    }
  }

  return "";
};

export const findRecruiterEmail = async ({ companyDomain }) => {
  const apiKey = process.env.HUNTER_API_KEY;
  const normalizedDomain = normalizeDomain(companyDomain);

  if (!apiKey || !normalizedDomain) {
    return {
      success: false,
      skipped: true,
      email: "",
      message: !apiKey ? "HUNTER_API_KEY missing." : "Company domain unavailable.",
    };
  }

  try {
    const response = await axios.get("https://api.hunter.io/v2/domain-search", {
      params: {
        domain: normalizedDomain,
        api_key: apiKey,
        limit: 10,
      },
      timeout: 12000,
    });

    const emails = Array.isArray(response.data?.data?.emails) ? response.data.data.emails : [];
    const recruiter = emails.find((entry) => {
      const position = String(entry?.position || "").toLowerCase();
      return position.includes("recruit") || position.includes("talent") || position.includes("hiring");
    }) || emails[0];

    if (!recruiter?.value) {
      return {
        success: false,
        skipped: false,
        email: "",
        message: "No recruiter email found.",
      };
    }

    return {
      success: true,
      skipped: false,
      email: String(recruiter.value).trim().toLowerCase(),
      message: "Recruiter email found.",
    };
  } catch (error) {
    return {
      success: false,
      skipped: false,
      email: "",
      message: error.response?.data?.errors?.[0]?.details || error.message || "Hunter lookup failed.",
    };
  }
};
