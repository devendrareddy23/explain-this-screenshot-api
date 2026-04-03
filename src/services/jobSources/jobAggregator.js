import indeedSource from "./indeedSource.js";
import weworkremotelySource from "./weworkremotelySource.js";
import remotiveSource from "./remotiveSource.js";
import remoteokSource from "./remoteokSource.js";
import wellfoundSource from "./wellfoundSource.js";
import greenhouseSource from "./greenhouseSource.js";
import naukriSource from "./naukriSource.js";
import linkedinSource from "./linkedinSource.js";

const SOURCES = [
  indeedSource,
  weworkremotelySource,
  remotiveSource,
  remoteokSource,
  wellfoundSource,
  greenhouseSource,
  naukriSource,
  linkedinSource,
];

export async function aggregateJobsFromSources({ keywords, location, country, limit = 20 }) {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const jobs = await source.fetch(keywords, location, country, limit);
      console.log(`Job source ${source.name} succeeded with ${jobs.length} jobs.`);
      return jobs;
    })
  );

  const failedSources = [];
  const dedupeMap = new Map();

  for (let index = 0; index < results.length; index += 1) {
    const source = SOURCES[index];
    const result = results[index];

    if (result.status !== "fulfilled") {
      const message = result.reason?.message || "Source failed.";
      console.error(`Job source ${source.name} failed:`, message);
      failedSources.push({ source: source.name, message });
      continue;
    }

    for (const job of result.value || []) {
      const sourceId = String(job?.sourceId || "").trim();
      const title = String(job?.title || "").trim().toLowerCase();
      const company = String(job?.company || "").trim().toLowerCase();
      const dedupeKey = sourceId
        ? `${String(job?.source || "").trim().toLowerCase()}::${sourceId}`
        : `${title}::${company}`;

      if (!dedupeMap.has(dedupeKey)) {
        dedupeMap.set(dedupeKey, job);
      }
    }
  }

  return {
    jobs: Array.from(dedupeMap.values()),
    failedSources,
  };
}
