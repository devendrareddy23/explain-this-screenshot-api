import axios from "axios";
import { JOB_SOURCE_TIMEOUT_MS } from "../serviceTimeouts.js";

export default {
  name: "RemoteOK",
  async fetch(keywords) {
    const response = await axios.get("https://remoteok.com/api", {
      timeout: JOB_SOURCE_TIMEOUT_MS,
      headers: {
        "User-Agent": "HireFlowAI/1.0 (+https://hireflow.ai)",
      },
    });

    const loweredKeywords = String(keywords || "").toLowerCase();
    const terms = loweredKeywords.split(",").map((item) => item.trim()).filter(Boolean);
    const rows = Array.isArray(response.data) ? response.data.slice(1) : [];

    return rows
      .map((job) => {
        const title = String(job?.position || "").trim();
        const description = String(job?.description || "").trim();
        const tags = Array.isArray(job?.tags) ? job.tags : [];
        const haystack = `${title} ${description} ${tags.join(" ")}`.toLowerCase();

        if (terms.length && !terms.some((term) => haystack.includes(term))) {
          return null;
        }

        return {
          title,
          company: String(job?.company || "").trim(),
          location: String(job?.location || "Remote").trim(),
          workType: "remote",
          description,
          applyUrl: String(job?.url || "").trim(),
          source: "RemoteOK",
          sourceId: String(job?.id || job?.slug || job?.url || "").trim(),
          postedAt: job?.date || null,
          tags,
        };
      })
      .filter(Boolean);
  },
};
