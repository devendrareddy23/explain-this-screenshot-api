import Application from "../models/Application.js";
import Job from "../models/Job.js";

function deriveQueueBucketCounts(jobs = []) {
  const summary = {
    queueCount: 0,
    matchedCount: 0,
    readyCount: 0,
    manualActionNeededCount: 0,
  };

  for (const job of jobs) {
    const isManual = Boolean(job?.manualActionRequired || job?.manualActionNeeded);
    const isReady = Boolean(
      !isManual &&
        (job?.sourceCapabilities?.autoApplySupported || (job?.tailoredResumeText && job?.coverLetterText))
    );

    summary.queueCount += 1;

    if (isManual) {
      summary.manualActionNeededCount += 1;
    } else if (isReady) {
      summary.readyCount += 1;
    } else {
      summary.matchedCount += 1;
    }
  }

  return summary;
}

export const getMyStats = async (req, res) => {
  try {
    const [applications, jobs] = await Promise.all([
      Application.find({ user: req.user._id }).lean(),
      Job.find({
        profileEmail: req.user.email,
        skipped: { $ne: true },
      })
        .select("_id jobId applied skipped")
        .lean(),
    ]);

    const totalApplicationsSent = applications.length;
    const interviewsScheduled = applications.filter(
      (item) => item.lifecycleStatus === "Interview"
    ).length;
    const responseCount = applications.filter((item) =>
      ["Viewed", "Interview", "Offer", "Negotiating"].includes(item.lifecycleStatus)
    ).length;
    const responseRate = totalApplicationsSent
      ? Math.round(responseCount / totalApplicationsSent * 100)
      : 0;
    const planLimit = req.user.plan === "pro" ? 100 : 5;
    const appliedJobIds = new Set(
      applications
        .flatMap((item) => [item.jobId, item.job])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );
    const jobsInQueue = jobs.filter((job) => {
      const candidates = [job._id, job.jobId].map((value) => String(value || "").trim()).filter(Boolean);
      return !candidates.some((candidate) => appliedJobIds.has(candidate));
    }).length;

    return res.status(200).json({
      success: true,
      stats: {
        totalApplicationsSent,
        interviewsScheduled,
        responseRate,
        jobsInQueue,
        applicationsUsed: totalApplicationsSent,
        applicationLimit: planLimit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load stats.",
      error: error.message,
    });
  }
};

export const getMyPipelineSummary = async (req, res) => {
  try {
    const [applications, jobs] = await Promise.all([
      Application.find({ user: req.user._id })
        .select("status lifecycleStatus job jobId")
        .lean(),
      Job.find({
        profileEmail: req.user.email,
        skipped: { $ne: true },
      })
        .select(
          "_id jobId applied manualActionRequired manualActionNeeded sourceCapabilities tailoredResumeText coverLetterText"
        )
        .lean(),
    ]);

    const appliedJobIds = new Set(
      applications
        .flatMap((item) => [item.jobId, item.job])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    );
    const visibleQueueJobs = jobs.filter((job) => {
      const candidates = [job._id, job.jobId].map((value) => String(value || "").trim()).filter(Boolean);
      return !candidates.some((candidate) => appliedJobIds.has(candidate));
    });
    const queueBuckets = deriveQueueBucketCounts(visibleQueueJobs);
    const appliedCount = applications.length;
    const failedCount = applications.filter((item) => item.status === "failed").length;
    const viewedCount = applications.filter((item) => item.lifecycleStatus === "Viewed").length;
    const interviewCount = applications.filter((item) => item.lifecycleStatus === "Interview").length;
    const offerCount = applications.filter((item) => item.lifecycleStatus === "Offer").length;
    const negotiatingCount = applications.filter((item) => item.lifecycleStatus === "Negotiating").length;

    return res.status(200).json({
      success: true,
      summary: {
        totalApplications: appliedCount,
        appliedCount,
        failedCount,
        manualActionNeededCount: queueBuckets.manualActionNeededCount,
        queueCount: queueBuckets.queueCount,
        matchedCount: queueBuckets.matchedCount,
        readyCount: queueBuckets.readyCount,
        viewedCount,
        interviewCount,
        offerCount,
        negotiatingCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load pipeline summary.",
      error: error.message,
    });
  }
};
