import axios from "axios";
import { JOB_SOURCE_TIMEOUT_MS } from "../serviceTimeouts.js";

export default {
  name: "Adzuna",
  async fetch(keywords, location = "", country = "in", limit = 20) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY || process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) {
      return [];
    }

    const response = await axios.get(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`, {
      timeout: JOB_SOURCE_TIMEOUT_MS,
      params: {
        app_id: appId,
        app_key: appKey,
        results_per_page: limit,
        what: keywords,
        ...(location ? { where: location } : {}),
      },
    });

    const results = Array.isArray(response.data?.results) ? response.data.results : [];
    return results.map((job) => ({
      title: String(job?.title || "").trim(),
      company: String(job?.company?.display_name || "").trim(),
      location: String(job?.location?.display_name || "").trim(),
      workType: `${job?.location?.display_name || ""}`.toLowerCase().includes("remote") ? "remote" : "onsite",
      description: String(job?.description || "").trim(),
      applyUrl: String(job?.redirect_url || "").trim(),
      source: "Adzuna",
      sourceId: String(job?.id || "").trim(),
      postedAt: job?.created || null,
    })).filter((job) => job.title && job.applyUrl);
  },
};
