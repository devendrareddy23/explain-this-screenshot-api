const STATUS_LABELS = {
  found: "Job Found",
  scored: "Scored",
  shortlisted: "Shortlisted",
  resume_tailored: "Resume Tailored",
  cover_letter_generated: "Cover Letter Generated",
  ready_to_apply: "Ready To Apply",
  applied: "Applied",
  failed: "Failed",
  manual_action_needed: "Manual Action Needed",
};

export const normalizeWorkflowTimeline = (timeline = []) => {
  return Array.isArray(timeline) ? timeline : [];
};

export const appendWorkflowEvent = (job, status, note = "") => {
  const timeline = normalizeWorkflowTimeline(job.workflowTimeline);
  const lastEvent = timeline[timeline.length - 1];

  if (lastEvent?.status === status && lastEvent?.note === note) {
    return timeline;
  }

  timeline.push({
    status,
    label: STATUS_LABELS[status] || status,
    note,
    at: new Date(),
  });

  job.workflowTimeline = timeline;
  return timeline;
};

export const syncJobWorkflowState = (job) => {
  let nextState = "found";

  if (job.manualActionNeeded) {
    nextState = "manual_action_needed";
  } else if (job.applied) {
    nextState = "applied";
  } else if (job.tailoredResumeText && job.coverLetterText) {
    nextState = "ready_to_apply";
  } else if (job.coverLetterText) {
    nextState = "cover_letter_generated";
  } else if (job.tailoredResumeText) {
    nextState = "resume_tailored";
  } else if (job.shortlisted) {
    nextState = "shortlisted";
  } else if ((job.score || job.matchScore || 0) > 0) {
    nextState = "scored";
  }

  job.workflowState = nextState;
  appendWorkflowEvent(job, nextState, job.manualActionReason || "");
  return job;
};

export const getWorkflowSummary = (jobs = []) => {
  const summary = {
    totalFound: jobs.length,
    totalShortlisted: 0,
    totalTailored: 0,
    totalApplicationsSent: 0,
    failedApplications: 0,
    manualActionNeeded: 0,
  };

  for (const job of jobs) {
    if (job.shortlisted) summary.totalShortlisted += 1;
    if (job.tailoredResumeText) summary.totalTailored += 1;
    if (job.applied) summary.totalApplicationsSent += 1;
    if (job.workflowState === "failed") summary.failedApplications += 1;
    if (job.manualActionNeeded) summary.manualActionNeeded += 1;
  }

  return summary;
};
