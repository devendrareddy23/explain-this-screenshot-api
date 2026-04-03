import { fetchRssItems, sanitizeText } from "./rssSourceUtils.js";

export default {
  name: "Wellfound",
  async fetch(keywords) {
    const loweredKeywords = String(keywords || "").toLowerCase();
    const terms = loweredKeywords.split(",").map((item) => item.trim()).filter(Boolean);
    const items = await fetchRssItems("https://wellfound.com/jobs.rss");

    return items
      .map((item, index) => {
        const title = sanitizeText(item?.title);
        const description = sanitizeText(item?.description);
        const content = `${title} ${description}`.toLowerCase();

        if (terms.length && !terms.some((term) => content.includes(term))) {
          return null;
        }

        return {
          title,
          company: sanitizeText(item?.author || ""),
          location: sanitizeText(item?.location || "Remote"),
          workType: content.includes("remote") ? "remote" : "onsite",
          description,
          applyUrl: sanitizeText(item?.link),
          source: "Wellfound",
          sourceId: sanitizeText(item?.guid?._ || item?.guid || item?.link || `wellfound-${index}`),
          postedAt: item?.pubDate || null,
        };
      })
      .filter(Boolean);
  },
};
