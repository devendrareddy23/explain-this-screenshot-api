import express from "express";
import axios from "axios";
import Job from "../models/Job.js";
import { sendAutoAppliedEmail } from "../services/emailService.js";

const router = express.Router();

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractKeywordsFromText(text) {
  const cleaned = normalizeText(text)
    .replace(/[^a-z0-9+#.\s/-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const stopWords = new Set([
    "and",
    "the",
    "with",
    "for",
    "you",
    "are",
    "this",
    "that",
    "from",
    "have",
    "has",
    "will",
    "your",
    "our",
    "into",
    "able",
    "must",
    "job",
    "role",
    "work",
    "good",
    "best",
    "using",
    "developer",
    "engineer",
  ]);

  return uniqueArray(
    cleaned.filter((word) => word.length > 2 && !stopWords.has(word))
  );
}

function scoreJob({
  job,
  resumeText,
  preferredRoles,
  preferredLocations,
  remoteOnly,
}) {
  const title = normalizeText(job.title);
  const description = normalizeText(job.description);
  const location = normalizeText(job.location);
  const fullJobText = `${title} ${description} ${location}`;

  const resumeKeywords = extractKeywordsFromText(resumeText).slice(0, 40);
  const roleKeywords = extractKeywordsFromText(preferredRoles).slice(0, 20);
  const locationKeywords = extractKeywordsFromText(preferredLocations).slice(0, 20);

  let score = 0;
  const matchReasons = [];

  let resumeMatches = 0;
  for (const keyword of resumeKeywords) {
    if (fullJobText.includes(keyword)) {
      resumeMatches += 1;
    }
  }

  const resumeScore = Math.min(resumeMatches * 3, 45);
  score += resumeScore;
  if (resumeScore > 0) {
    matchReasons.push(`Resume skill matches: ${resumeMatches}`);
  }

  let roleMatches = 0;
  for (const keyword of roleKeywords) {
    if (fullJobText.includes(keyword)) {
      roleMatches += 1;
    }
  }

  const roleScore = Math.min(roleMatches * 8, 25);
  score += roleScore;
  if (roleScore > 0) {
    matchReasons.push(`Preferred role matches: ${roleMatches}`);
  }

  const remoteSignals = ["remote", "work from home", "wfh", "hybrid"];
  const isRemoteFriendly = remoteSignals.some((signal) =>
    fullJobText.includes(signal)
  );

  if (remoteOnly) {
    if (isRemoteFriendly) {
      score += 15;
      matchReasons.push("Remote-friendly job");
    } else {
      score -= 15;
      matchReasons.push("Not clearly remote");
    }
  }

  let locationMatches = 0;
  for (const keyword of locationKeywords) {
    if (fullJobText.includes(keyword)) {
      locationMatches += 1;
    }
  }

  const locationScore = Math.min(locationMatches * 5, 15);
  score += locationScore;
  if (locationScore > 0) {
    matchReasons.push(`Preferred location matches: ${locationMatches}`);
  }

  if (title.includes("node")) {
    score += 5;
    matchReasons.push("Node.js title match");
  }

  if (title.includes("backend")) {
    score += 5;
    matchReasons.push("Backend title match");
  }

  if (description.includes("mongodb")) {
    score += 3;
    matchReasons.push("MongoDB mentioned");
  }

  if (description.includes("express")) {
    score += 3;
    matchReasons.push("Express mentioned");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    matchReasons: uniqueArray(matchReasons),
  };
}

async function fetchAdzunaJobs({ search, limit = 20, country = "in" }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error("Missing ADZUNA_APP_ID or ADZUNA_APP_KEY in env.");
  }

  const encodedSearch = encodeURIComponent(search || "node.js backend developer");

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=${limit}&what=${encodedSearch}&content-type=application/json`;

  const response = await axios.get(url, {
    timeout: 30000,
  });

  return response.data?.results || [];
}

router.post("/search", async (req, res) => {
  try {
    const {
      search = "Node.js Developer Backend Engineer",
      limit = 20,
      country = "in",
      profileName = "",
      profileEmail = "",
      profilePhone = "",
      profileLinkedIn = "",
      profileGitHub = "",
      resumeText = "",
      preferredRoles = "Backend Engineer, Node.js Developer",
      preferredLocations = "Remote, India, Worldwide",
      minimumScore = 0,
      remoteOnly = false,
      autoApplyAbove = 70,
    } = req.body || {};

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const adzunaJobs = await fetchAdzunaJobs({
      search,
      limit,
      country,
    });

    const processedJobs = [];
    let autoAppliedCount = 0;
    let emailSentCount = 0;

    for (const item of adzunaJobs) {
      const jobId = String(item.id || "");
      const title = item.title || "";
      const company = item.company?.display_name || "";
      const location = item.location?.display_name || "";
      const description = item.description || "";
      const redirectUrl = item.redirect_url || "";

      const { score, matchReasons } = scoreJob({
        job: {
          title,
          description,
          location,
        },
        resumeText,
        preferredRoles,
        preferredLocations,
        remoteOnly,
      });

      if (score < Number(minimumScore || 0)) {
        continue;
      }

      const shouldAutoApply = score >= Number(autoApplyAbove || 70);

      const existingJob = await Job.findOne({
        jobId,
        profileEmail,
      });

      let updatedJob;

      if (!existingJob) {
        updatedJob = await Job.create({
          jobId,
          profileEmail,
          title,
          company,
          location,
          description,
          redirectUrl,
          source: "adzuna",
          score,
          matchReasons,
          applied: shouldAutoApply,
          appliedAt: shouldAutoApply ? new Date() : null,
          emailSentAt: null,
          rawJob: item,
        });

        if (shouldAutoApply) {
          autoAppliedCount += 1;

          try {
            await sendAutoAppliedEmail({
              to: profileEmail,
              title,
              company,
              location,
              score,
              redirectUrl,
            });

            updatedJob.emailSentAt = new Date();
            await updatedJob.save();
            emailSentCount += 1;
          } catch (emailError) {
            console.error("Email send failed:", emailError.message);
          }
        }
      } else {
        existingJob.title = title;
        existingJob.company = company;
        existingJob.location = location;
        existingJob.description = description;
        existingJob.redirectUrl = redirectUrl;
        existingJob.source = "adzuna";
        existingJob.score = score;
        existingJob.matchReasons = matchReasons;
        existingJob.rawJob = item;

        const wasAppliedBefore = existingJob.applied === true;

        if (!wasAppliedBefore && shouldAutoApply) {
          existingJob.applied = true;
          existingJob.appliedAt = new Date();
          autoAppliedCount += 1;

          try {
            await sendAutoAppliedEmail({
              to: profileEmail,
              title,
              company,
              location,
              score,
              redirectUrl,
            });

            existingJob.emailSentAt = new Date();
            emailSentCount += 1;
          } catch (emailError) {
            console.error("Email send failed:", emailError.message);
          }
        }

        updatedJob = await existingJob.save();
      }

      processedJobs.push(updatedJob);
    }

    const allJobs = await Job.find({ profileEmail }).sort({
      score: -1,
      createdAt: -1,
    });

    const shortlisted = allJobs.filter((job) => job.score >= 70);
    const appliedJobs = allJobs.filter((job) => job.applied === true);
    const remaining = allJobs.filter((job) => job.applied !== true);

    return res.json({
      success: true,
      profile: {
        profileName,
        profileEmail,
        profilePhone,
        profileLinkedIn,
        profileGitHub,
      },
      searchSummary: {
        search,
        country,
        limit,
        minimumScore,
        autoApplyAbove,
        remoteOnly,
      },
      totals: {
        fetchedFromAdzuna: adzunaJobs.length,
        storedAfterFilter: processedJobs.length,
        totalJobsInDb: allJobs.length,
        shortlisted: shortlisted.length,
        applied: appliedJobs.length,
        remaining: remaining.length,
        autoAppliedThisRun: autoAppliedCount,
        emailsSentThisRun: emailSentCount,
      },
      jobs: allJobs,
    });
  } catch (error) {
    console.error("POST /api/jobs/search error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to search and process jobs.",
      error: error.message,
    });
  }
});

router.get("/stored", async (req, res) => {
  try {
    const { profileEmail = "", applied = "", country = "" } = req.query;

    if (!profileEmail) {
      return res.status(400).json({
        success: false,
        message: "profileEmail is required.",
      });
    }

    const query = { profileEmail };

    if (applied === "true") {
      query.applied = true;
    }

    if (applied === "false") {
      query.applied = false;
    }

    const jobs = await Job.find(query).sort({
      score: -1,
      createdAt: -1,
    });

    return res.json({
      success: true,
      country,
      total: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("GET /api/jobs/stored error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stored jobs.",
      error: error.message,
    });
  }
});

export default router;
