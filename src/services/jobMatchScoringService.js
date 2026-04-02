const SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead", "manager"];

const normalizeText = (value = "") => String(value || "").toLowerCase();

const includesAny = (text, keywords = []) => {
  return keywords.some((keyword) => text.includes(keyword));
};

const detectCandidateLevel = (resumeText = "") => {
  const text = normalizeText(resumeText);

  if (includesAny(text, ["staff engineer", "principal engineer", "engineering manager", "head of engineering"])) {
    return "manager";
  }

  if (includesAny(text, ["lead engineer", "tech lead", "senior software engineer", "senior backend engineer"])) {
    return "lead";
  }

  if (includesAny(text, ["senior", "5+ years", "6+ years", "7+ years", "8+ years"])) {
    return "senior";
  }

  if (includesAny(text, ["3+ years", "4+ years", "software engineer", "backend engineer", "full stack engineer"])) {
    return "mid";
  }

  if (includesAny(text, ["1+ years", "2+ years", "associate", "junior"])) {
    return "junior";
  }

  return "mid";
};

const detectJobLevel = (job = {}) => {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();

  if (includesAny(text, ["intern", "internship", "trainee"])) return "intern";
  if (includesAny(text, ["junior", "entry level", "entry-level", "associate"])) return "junior";
  if (includesAny(text, ["staff", "principal", "director", "vp", "vice president"])) return "manager";
  if (includesAny(text, ["lead", "tech lead", "team lead"])) return "lead";
  if (includesAny(text, ["senior", "sr."])) return "senior";

  return "mid";
};

const getLevelDistance = (candidateLevel, jobLevel) => {
  const candidateIndex = SENIORITY_LEVELS.indexOf(candidateLevel);
  const jobIndex = SENIORITY_LEVELS.indexOf(jobLevel);

  if (candidateIndex === -1 || jobIndex === -1) {
    return 1;
  }

  return Math.abs(candidateIndex - jobIndex);
};

const computeSkillsScore = (job = {}, preferredRoles = [], careerDna = null) => {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();
  let rawScore = 0;
  const notes = [];

  if (includesAny(text, ["node", "node.js", "node js"])) {
    rawScore += 0.28;
    notes.push("Node.js skills align");
  }

  if (includesAny(text, ["backend", "api", "microservices", "server-side", "server side"])) {
    rawScore += 0.22;
    notes.push("Backend/API requirements align");
  }

  if (includesAny(text, ["mongodb", "postgres", "sql", "database", "mongoose"])) {
    rawScore += 0.12;
    notes.push("Database stack aligns");
  }

  if (includesAny(text, ["aws", "docker", "kubernetes", "azure", "gcp", "ci/cd"])) {
    rawScore += 0.08;
    notes.push("Cloud/devops overlap");
  }

  const normalizedRoles = Array.isArray(preferredRoles)
    ? preferredRoles.map((role) => normalizeText(role)).filter(Boolean)
    : [];

  if (normalizedRoles.some((role) => text.includes(role))) {
    rawScore += 0.3;
    notes.push("Preferred role language matches");
  }

  const dnaHardSkills = Array.isArray(careerDna?.hardSkills)
    ? careerDna.hardSkills
        .map((item) => normalizeText(item?.name))
        .filter(Boolean)
    : [];

  const matchingDnaSkills = dnaHardSkills.filter((skill) => text.includes(skill));

  if (matchingDnaSkills.length) {
    rawScore += 0.18;
    notes.push(`Career DNA hard skills align: ${matchingDnaSkills.slice(0, 3).join(", ")}`);
  }

  return {
    raw: Math.min(1, rawScore || 0.18),
    notes: notes.length ? notes : ["General skills overlap detected"],
  };
};

const computeExperienceScore = (job = {}, resumeText = "") => {
  const candidateLevel = detectCandidateLevel(resumeText);
  const jobLevel = detectJobLevel(job);
  const distance = getLevelDistance(candidateLevel, jobLevel);

  if (distance === 0) {
    return {
      raw: 1,
      note: `Experience level aligns (${candidateLevel} to ${jobLevel}).`,
    };
  }

  if (distance === 1) {
    return {
      raw: 0.7,
      note: `Experience level is adjacent (${candidateLevel} to ${jobLevel}).`,
    };
  }

  return {
    raw: 0.35,
    note: `Experience level looks stretched (${candidateLevel} to ${jobLevel}).`,
  };
};

const computeLocationScore = ({ job = {}, preferredLocations = [], workTypes = [] }) => {
  const locationText = normalizeText(job.location);
  const remote = Boolean(job.remote);
  const normalizedWorkTypes = Array.isArray(workTypes)
    ? workTypes.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const normalizedLocations = Array.isArray(preferredLocations)
    ? preferredLocations.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  const workTypeMatch =
    normalizedWorkTypes.length === 0 ||
    (normalizedWorkTypes.includes("remote") && remote) ||
    (normalizedWorkTypes.includes("hybrid") && locationText.includes("hybrid")) ||
    (normalizedWorkTypes.includes("onsite") && !remote);

  const locationMatch =
    normalizedLocations.length === 0 ||
    normalizedLocations.some((item) => locationText.includes(item));

  const raw = workTypeMatch && locationMatch ? 1 : workTypeMatch || locationMatch ? 0.65 : 0.25;

  return {
    raw,
    note: workTypeMatch && locationMatch
      ? "Location and work style align."
      : workTypeMatch || locationMatch
        ? "Partial location/work style match."
        : "Location or remote preference mismatch.",
  };
};

const computeSalaryScore = ({ job = {}, expectedSalaryMin, careerDna = null }) => {
  const expected = Number(expectedSalaryMin || careerDna?.salaryTargetValue);

  if (!Number.isFinite(expected) || expected <= 0) {
    return {
      raw: 1,
      note: "No salary preference set, so salary is neutral.",
    };
  }

  const salaryMax = Number(job.salaryMax);
  const salaryMin = Number(job.salaryMin);
  const bestKnown = Number.isFinite(salaryMax) ? salaryMax : Number.isFinite(salaryMin) ? salaryMin : 0;

  if (!bestKnown) {
    return {
      raw: 0.45,
      note: "Salary not listed, so salary match is uncertain.",
    };
  }

  if (bestKnown >= expected) {
    return {
      raw: 1,
      note: "Salary meets or exceeds preference.",
    };
  }

  if (bestKnown >= expected * 0.85) {
    return {
      raw: 0.65,
      note: "Salary is close to preference.",
    };
  }

  return {
    raw: 0.2,
    note: "Salary is below preference.",
  };
};

const inferCompanySize = (job = {}) => {
  const text = `${job.title || ""} ${job.description || ""}`.toLowerCase();

  if (includesAny(text, ["startup", "seed stage", "series a", "early stage"])) return "startup";
  if (includesAny(text, ["enterprise", "fortune 500", "global team", "large company"])) return "enterprise";
  if (includesAny(text, ["mid-size", "growing team", "scale-up"])) return "mid";

  return "unknown";
};

const computeCompanySizeScore = ({ job = {}, companySizePreference = "any", careerDna = null }) => {
  const preference = normalizeText(companySizePreference || "any");
  const wishlist = Array.isArray(careerDna?.dreamCompanyWishlist)
    ? careerDna.dreamCompanyWishlist.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const companyText = normalizeText(job.company);

  if (wishlist.length && companyText && wishlist.some((item) => companyText.includes(item))) {
    return {
      raw: 1,
      note: "Dream company wishlist match.",
    };
  }

  if (!preference || preference === "any") {
    return {
      raw: 1,
      note: "No company size preference set.",
    };
  }

  const inferred = inferCompanySize(job);

  if (inferred === "unknown") {
    return {
      raw: 0.5,
      note: "Company size could not be inferred.",
    };
  }

  return {
    raw: inferred === preference ? 1 : 0.25,
    note: inferred === preference ? "Company size preference aligns." : "Company size preference mismatch.",
  };
};

export const scoreJobMatch = ({
  job,
  preferredRoles = [],
  preferredLocations = [],
  workTypes = [],
  expectedSalaryMin = null,
  companySizePreference = "any",
  resumeText = "",
  careerDna = null,
}) => {
  const skills = computeSkillsScore(job, preferredRoles, careerDna);
  const experience = computeExperienceScore(job, resumeText);
  const location = computeLocationScore({ job, preferredLocations, workTypes });
  const salary = computeSalaryScore({ job, expectedSalaryMin, careerDna });
  const companySize = computeCompanySizeScore({ job, companySizePreference, careerDna });

  const weighted =
    skills.raw * 4 +
    experience.raw * 2 +
    location.raw * 2 +
    salary.raw * 1 +
    companySize.raw * 1;

  const score10 = Math.max(0, Math.min(10, Number(weighted.toFixed(1))));
  const score100 = Math.round(score10 * 10);

  let label = "Weak Match";
  if (score10 >= 8) label = "Strong Match";
  else if (score10 >= 5) label = "Good Match";

  return {
    score10,
    score100,
    label,
    shouldShowToUser: score10 >= 5,
    autoApplyRecommended: score10 >= 8,
    breakdown: {
      skills: {
        weight: 40,
        score: Number((skills.raw * 4).toFixed(1)),
        note: skills.notes.join(", "),
      },
      experience: {
        weight: 20,
        score: Number((experience.raw * 2).toFixed(1)),
        note: experience.note,
      },
      location: {
        weight: 20,
        score: Number((location.raw * 2).toFixed(1)),
        note: location.note,
      },
      salary: {
        weight: 10,
        score: Number((salary.raw * 1).toFixed(1)),
        note: salary.note,
      },
      companySize: {
        weight: 10,
        score: Number((companySize.raw * 1).toFixed(1)),
        note: companySize.note,
      },
    },
  };
};
