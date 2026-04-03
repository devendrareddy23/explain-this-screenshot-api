import axios from "axios";
import { JOB_SOURCE_TIMEOUT_MS } from "../serviceTimeouts.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(value = "") {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default {
  name: "Naukri",
  async fetch(keywords, location = "India") {
    await delay(2000);

    const response = await axios.get("https://www.naukri.com/jobs-in-india", {
      timeout: JOB_SOURCE_TIMEOUT_MS,
      params: {
        k: keywords,
        l: location || "India",
      },
      headers: {
        "User-Agent": "HireFlowAI/1.0 (+https://hireflow.ai)",
      },
    });

    const html = String(response.data || "");
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<span[^>]*class="companyInfo[^"]*"[\s\S]*?<a[^>]*title="([^"]+)"/g)];

    return matches.slice(0, 20).map((match, index) => ({
      title: stripHtml(match[2]),
      company: stripHtml(match[3]),
      location: location || "India",
      workType: "onsite",
      description: "",
      applyUrl: String(match[1] || "").trim(),
      source: "Naukri",
      sourceId: `naukri-${index}-${stripHtml(match[2])}`,
      postedAt: null,
    })).filter((job) => job.title && job.applyUrl);
  },
};
