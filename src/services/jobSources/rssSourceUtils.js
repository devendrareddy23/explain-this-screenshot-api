import axios from "axios";
import { parseStringPromise } from "xml2js";
import { JOB_SOURCE_TIMEOUT_MS } from "../serviceTimeouts.js";

export async function fetchRssItems(url) {
  const response = await axios.get(url, {
    timeout: JOB_SOURCE_TIMEOUT_MS,
    headers: {
      "User-Agent": "HireFlowAI/1.0 (+https://hireflow.ai)",
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });

  const parsed = await parseStringPromise(response.data, {
    trim: true,
    explicitArray: false,
    mergeAttrs: true,
  });

  const items = parsed?.rss?.channel?.item;
  return Array.isArray(items) ? items : items ? [items] : [];
}

export function decodeHtml(value = "") {
  return String(value || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeText(value = "") {
  return decodeHtml(value).trim();
}
