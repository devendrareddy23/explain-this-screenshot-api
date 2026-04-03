import axios from "axios";
import { JOB_SOURCE_TIMEOUT_MS } from "../serviceTimeouts.js";

export default {
  name: "Remotive",
  async fetch(keywords) {
    const response = await axios.get("https://remotive.com/api/remote-jobs", {
      timeout: JOB_SOURCE_TIMEOUT_MS,
      params: {
        category: "software-dev",
        search: keywords,
      },
    });

    const jobs = Array.isArray(response.data?.jobs) ? response.data.jobs : [];

    return jobs.map((job) => ({
      title: String(job?.title || "").trim(),
      company: String(job?.company_name || "").trim(),
      location: String(job?.candidate_required_location || "Remote").trim(),
      workType: "remote",
      description: String(job?.description || "").trim(),
      applyUrl: String(job?.url || "").trim(),
      source: "Remotive",
      sourceId: String(job?.id || job?.url || "").trim(),
      postedAt: job?.publication_date || null,
      tags: Array.isArray(job?.tags) ? job.tags : [],
    })).filter((job) => job.title && job.applyUrl);
  },
};
