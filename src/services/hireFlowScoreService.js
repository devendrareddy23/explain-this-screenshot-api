import Application from "../models/Application.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import UserPreference from "../models/UserPreference.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hasMeaningfulText = (value = "", min = 80) => String(value || "").trim().length >= min;

const computeResumeStrength = ({ user, preference, jobs }) => {
  let points = 0;
  const reasons = [];
  const resumeExists = hasMeaningfulText(user?.masterResumeText, 120);

  if (resumeExists) {
    points += 90;
    reasons.push("Master resume is saved and usable.");
  } else {
    reasons.push("Add a stronger master resume to unlock more resume-strength points.");
  }

  const tailoredCount = jobs.filter((job) => hasMeaningfulText(job.tailoredResumeText, 120)).length;
  if (tailoredCount >= 5) {
    points += 70;
    reasons.push("You have multiple tailored resume outputs already generated.");
  } else if (tailoredCount > 0) {
    points += 40;
    reasons.push("You have started tailoring resumes, but the history is still small.");
  }

  const experimentWinner = String(preference?.resumeExperiment?.winningVariant || "").trim();
  if (experimentWinner) {
    points += 40;
    reasons.push(`Resume Version ${experimentWinner} has enough data to guide future sends.`);
  }

  return {
    score: clamp(points, 0, 200),
    reasons,
  };
};

const computeApplicationQuality = ({ jobs, applications }) => {
  const appliedJobReferences = new Set(
    applications
      .flatMap((application) => [application?.job, application?.jobId])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  );
  const appliedJobs = jobs.filter((job) =>
    [job?._id, job?.jobId]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .some((candidate) => appliedJobReferences.has(candidate))
  );
  let points = 0;
  const reasons = [];

  if (!appliedJobs.length) {
    return {
      score: 0,
      reasons: ["Send a few high-quality applications to establish an application-quality baseline."],
    };
  }

  const avgScore = appliedJobs.reduce((sum, job) => sum + Number(job.aiScore10 || 0), 0) / appliedJobs.length;
  points += clamp(Math.round(avgScore / 10 * 110), 0, 110);

  const withCoverLetters = appliedJobs.filter((job) => hasMeaningfulText(job.coverLetterText, 60)).length;
  points += clamp(Math.round(withCoverLetters / appliedJobs.length * 50), 0, 50);

  const manualPrepReady = appliedJobs.filter((job) => job.workflowState === "ready_to_apply" || hasMeaningfulText(job.tailoredResumeText, 120)).length;
  points += clamp(Math.round(manualPrepReady / appliedJobs.length * 40), 0, 40);

  reasons.push(`Average applied-job match is ${(avgScore || 0).toFixed(1)}/10.`);
  if (withCoverLetters) {
    reasons.push(`${withCoverLetters} applied roles had a generated cover letter.`);
  }

  return {
    score: clamp(points, 0, 200),
    reasons,
  };
};

const computeResponseRate = ({ applications }) => {
  const total = applications.length;
  if (!total) {
    return {
      score: 0,
      reasons: ["No application-response data yet. Response-rate points start once applications are sent."],
      rate: 0,
    };
  }

  const positive = applications.filter((item) => ["Viewed", "Interview", "Offer", "Negotiating"].includes(item.lifecycleStatus)).length;
  const rate = positive / total * 100;
  const score = clamp(Math.round(rate / 25 * 200), 0, 200);

  return {
    score,
    reasons: [`${positive} of ${total} applications have progressed beyond a cold send.`],
    rate: Math.round(rate),
  };
};

const computeInterviewConversion = ({ applications }) => {
  const responded = applications.filter((item) => ["Viewed", "Interview", "Offer", "Negotiating"].includes(item.lifecycleStatus));
  const interviews = applications.filter((item) => item.lifecycleStatus === "Interview");
  const offers = applications.filter((item) => ["Offer", "Negotiating"].includes(item.lifecycleStatus));

  if (!responded.length) {
    return {
      score: 0,
      reasons: ["Interview-conversion points appear once responses and interviews start arriving."],
    };
  }

  const interviewRate = interviews.length / responded.length;
  const offerBonus = clamp(offers.length * 25, 0, 50);
  const score = clamp(Math.round(interviewRate * 150) + offerBonus, 0, 200);

  return {
    score,
    reasons: [
      `${interviews.length} interviews from ${responded.length} positive responses.`,
      offers.length ? `${offers.length} offers or negotiation-stage outcomes increase your conversion score.` : "Offers will push this section higher once they appear.",
    ],
  };
};

const computeProfileCompleteness = ({ user, preference, connections }) => {
  let points = 0;
  const reasons = [];

  if (String(user?.name || "").trim()) points += 25;
  if (hasMeaningfulText(user?.masterResumeText, 120)) points += 45;
  if ((preference?.preferredRoles || []).length) points += 30;
  if ((preference?.preferredLocations || []).length) points += 20;
  if ((preference?.workTypes || []).length) points += 15;
  if (String(preference?.careerDna?.summary || "").trim()) points += 30;
  if ((preference?.careerDna?.hardSkills || []).length) points += 15;
  if ((preference?.connectionsCount || connections || 0) > 0) points += 10;
  if (preference?.candidateDiscovery?.enabled) points += 10;

  reasons.push("Complete profiles rank better inside HireFlow and are more discovery-ready for future recruiter surfaces.");

  return {
    score: clamp(points, 0, 200),
    reasons,
  };
};

export const getHireFlowScoreProfile = async ({ userId, profileEmail }) => {
  const [user, preference, applications, jobs] = await Promise.all([
    User.findById(userId).select("name email masterResumeText plan status"),
    UserPreference.findOne({ user: userId }),
    Application.find({ profileEmail }).sort({ appliedAt: -1 }),
    Job.find({ profileEmail }).sort({ createdAt: -1 }),
  ]);

  const resumeStrength = computeResumeStrength({ user, preference, jobs });
  const applicationQuality = computeApplicationQuality({ jobs, applications });
  const responseRate = computeResponseRate({ applications });
  const interviewConversion = computeInterviewConversion({ applications });
  const profileCompleteness = computeProfileCompleteness({
    user,
    preference,
    connections: 0,
  });

  const total = clamp(
    resumeStrength.score +
      applicationQuality.score +
      responseRate.score +
      interviewConversion.score +
      profileCompleteness.score,
    0,
    1000
  );

  const badge = total >= 750 ? "Top Candidate" : total >= 550 ? "High Potential" : "Rising Candidate";

  return {
    total,
    badge,
    recruiterDiscoveryReady: Boolean(preference?.candidateDiscovery?.enabled && total >= 750),
    sections: {
      resumeStrength,
      applicationQuality,
      responseRate,
      interviewConversion,
      profileCompleteness,
    },
    note:
      total >= 750
        ? "Your profile is strong enough to earn a Top Candidate badge inside HireFlow."
        : "Improve the lowest sections to unlock the Top Candidate badge at 750+.",
    marketplaceStatus:
      "HireFlow can score and badge candidate quality today. A public employer search marketplace is not live in this environment yet.",
  };
};
