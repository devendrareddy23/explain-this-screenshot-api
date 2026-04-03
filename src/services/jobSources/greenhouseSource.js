import axios from "axios";
import { JOB_SOURCE_TIMEOUT_MS } from "../serviceTimeouts.js";

const GREENHOUSE_BOARDS = [
  "razorpay",
  "postman",
  "browserstack",
  "freshworks",
  "chargebee",
  "atlan",
  "gupshup",
  "meesho",
  "sharechat",
  "dream11",
];

function inferWorkType(text = "") {
  const lowered = String(text || "").toLowerCase();
  if (lowered.includes("remote")) return "remote";
  if (lowered.includes("hybrid")) return "hybrid";
  return "onsite";
}

export default {
  name: "Greenhouse",
  async fetch(keywords) {
    const loweredKeywords = String(keywords || "").toLowerCase();
    const terms = loweredKeywords.split(",").map((item) => item.trim()).filter(Boolean);

    const results = await Promise.allSettled(
      GREENHOUSE_BOARDS.map(async (board) => {
        const response = await axios.get(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs`, {
          timeout: JOB_SOURCE_TIMEOUT_MS,
          params: { content: true },
        });
        return Array.isArray(response.data?.jobs) ? response.data.jobs : [];
      })
    );

    return results
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .map((job) => {
        const title = String(job?.title || "").trim();
        const company = String(job?.absolute_url || "")
          .replace(/^https?:\/\/boards\.greenhouse\.io\/?/, "")
          .split("/")[0]
          .trim();
        const location = String(job?.location?.name || "").trim();
        const content = String(job?.content || "").replace(/<[^>]+>/g, " ").trim();
        const haystack = `${title} ${location} ${content}`.toLowerCase();

        if (terms.length && !terms.some((term) => haystack.includes(term))) {
          return null;
        }

        return {
          title,
          company,
          location,
          workType: inferWorkType(`${location} ${content}`),
          description: content,
          applyUrl: String(job?.absolute_url || "").trim(),
          source: "Greenhouse",
          sourceId: String(job?.id || job?.internal_job_id || job?.absolute_url || "").trim(),
          postedAt: job?.updated_at || null,
        };
      })
      .filter(Boolean);
  },
};
