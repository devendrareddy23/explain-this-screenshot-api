import { fetchRssItems, sanitizeText } from "./rssSourceUtils.js";

function parseIndeedTitle(title = "") {
  const clean = sanitizeText(title);
  const parts = clean.split(" - ").map((item) => item.trim()).filter(Boolean);

  return {
    title: parts[0] || clean,
    company: parts[1] || "",
    location: parts.slice(2).join(" - "),
  };
}

export default {
  name: "Indeed",
  async fetch(keywords, location = "India") {
    const url = `https://www.indeed.com/rss?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location || "India")}`;
    const items = await fetchRssItems(url);

    return items.map((item, index) => {
      const parsed = parseIndeedTitle(item?.title);
      return {
        title: parsed.title,
        company: parsed.company,
        location: parsed.location || sanitizeText(item?.location || location || "India"),
        workType: "onsite",
        description: sanitizeText(item?.description),
        applyUrl: sanitizeText(item?.link),
        source: "Indeed",
        sourceId: sanitizeText(item?.guid?._ || item?.guid || item?.link || `indeed-${index}`),
        postedAt: item?.pubDate || null,
      };
    }).filter((job) => job.title && job.applyUrl);
  },
};
