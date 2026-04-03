import { fetchLinkedInJobsViaApify } from "../linkedinApifyService.js";

export default {
  name: "LinkedIn",
  async fetch(keywords, location, limit = 20) {
    const response = await fetchLinkedInJobsViaApify({
      search: keywords,
      location,
      limit,
    });

    if (response?.skipped || !Array.isArray(response?.jobs)) {
      return [];
    }

    return response.jobs.map((job) => ({
      title: String(job?.title || "").trim(),
      company: String(job?.company || "").trim(),
      location: String(job?.location || "").trim(),
      workType: String(job?.location || "").toLowerCase().includes("remote") ? "remote" : "onsite",
      description: String(job?.description || "").trim(),
      applyUrl: String(job?.applyUrl || "").trim(),
      source: "LinkedIn",
      sourceId: String(job?.jobId || job?.applyUrl || "").trim(),
      postedAt: job?.listedAt || null,
      easyApplyAvailable: Boolean(job?.easyApplyAvailable),
      rawJobData: job?.rawJobData || {},
    })).filter((job) => job.title && job.applyUrl);
  },
};
