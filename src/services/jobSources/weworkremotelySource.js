import { fetchRssItems, sanitizeText } from "./rssSourceUtils.js";

export default {
  name: "We Work Remotely",
  async fetch(keywords) {
    const loweredKeywords = String(keywords || "").toLowerCase();
    const terms = loweredKeywords.split(",").map((item) => item.trim()).filter(Boolean);
    const items = await fetchRssItems("https://weworkremotely.com/remote-jobs.rss");

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
          location: "Remote",
          workType: "remote",
          description,
          applyUrl: sanitizeText(item?.link),
          source: "WeWorkRemotely",
          sourceId: sanitizeText(item?.guid?._ || item?.guid || item?.link || `wwr-${index}`),
          postedAt: item?.pubDate || null,
        };
      })
      .filter(Boolean);
  },
};
