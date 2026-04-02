import OpenAI from "openai";
import { OPENAI_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

const HARD_SKILL_DICTIONARY = [
  "Node.js",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "SQL",
  "AWS",
  "Docker",
  "Kubernetes",
  "Python",
  "Java",
  "Go",
  "System Design",
  "APIs",
  "Microservices",
  "CI/CD",
  "Data Analysis",
  "Product Thinking",
];

const SOFT_SKILL_DICTIONARY = [
  "Leadership",
  "Ownership",
  "Communication",
  "Mentoring",
  "Collaboration",
  "Execution",
  "Adaptability",
  "Customer empathy",
  "Problem solving",
  "Stakeholder management",
  "Curiosity",
];

const CULTURE_DICTIONARY = [
  "Remote-first",
  "Fast-moving",
  "High ownership",
  "Collaborative",
  "Mission-driven",
  "Builder culture",
  "Mentorship-heavy",
  "Structured",
  "Startup pace",
  "Work-life balance",
];

const normalizeText = (value = "") => String(value || "").trim();

const safeList = (items = []) =>
  [...new Set(items.map((item) => normalizeText(item)).filter(Boolean))];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseSalaryValue = (value = "") => {
  const text = normalizeText(value).replace(/,/g, "");
  const matches = text.match(/(\d+(\.\d+)?)/g);

  if (!matches?.length) {
    return null;
  }

  const first = Number(matches[0]);
  if (!Number.isFinite(first)) {
    return null;
  }

  const lower = text.toLowerCase();

  if (lower.includes("lpa") || lower.includes("lakhs")) {
    return Math.round(first * 100000);
  }

  if (lower.includes("k")) {
    return Math.round(first * 1000);
  }

  return Math.round(first);
};

const extractWeightedSkills = (answersText, dictionary) => {
  const text = answersText.toLowerCase();

  return dictionary
    .map((skill) => {
      const count = text.includes(skill.toLowerCase()) ? 1 : 0;
      return {
        name: skill,
        weight: count ? 78 : 0,
      };
    })
    .filter((item) => item.weight > 0)
    .slice(0, 6);
};

const extractDreamCompanies = (value = "") => {
  return safeList(
    value
      .split(/,|\n|\/| and /i)
      .map((item) => item.trim())
  ).slice(0, 8);
};

const inferCulturePreferences = (answersText) => {
  const text = answersText.toLowerCase();

  return CULTURE_DICTIONARY.filter((item) => {
    const key = item.toLowerCase();
    if (key.includes("remote")) return text.includes("remote");
    if (key.includes("ownership")) return text.includes("ownership") || text.includes("autonomy");
    if (key.includes("collaborative")) return text.includes("team") || text.includes("collabor");
    if (key.includes("mission")) return text.includes("mission") || text.includes("impact");
    if (key.includes("builder")) return text.includes("build") || text.includes("ship");
    if (key.includes("mentorship")) return text.includes("mentor") || text.includes("learn");
    if (key.includes("structured")) return text.includes("structured") || text.includes("clear process");
    if (key.includes("startup")) return text.includes("startup") || text.includes("fast");
    if (key.includes("work-life")) return text.includes("balance");
    if (key.includes("fast-moving")) return text.includes("fast") || text.includes("pace");
    return false;
  }).slice(0, 5);
};

const buildFallbackCareerDna = (answers = {}) => {
  const combined = Object.values(answers).map((value) => normalizeText(value)).join(" ");
  const hardSkills = extractWeightedSkills(combined, HARD_SKILL_DICTIONARY);
  const softSkills = extractWeightedSkills(combined, SOFT_SKILL_DICTIONARY);
  const ambitionSeed = combined.toLowerCase();
  const ambitionScore = clamp(
    55 +
      (ambitionSeed.includes("lead") ? 12 : 0) +
      (ambitionSeed.includes("build") ? 8 : 0) +
      (ambitionSeed.includes("impact") ? 8 : 0) +
      (ambitionSeed.includes("scale") ? 7 : 0),
    40,
    96
  );
  const cultureFitPreferences = inferCulturePreferences(combined);
  const salaryTargetValue = parseSalaryValue(answers.yesSalary);
  const salaryConfidenceScore = clamp(
    50 +
      (salaryTargetValue ? 18 : 0) +
      (normalizeText(answers.yesSalary).toLowerCase().includes("immediately") ? 8 : 0),
    35,
    94
  );
  const dreamCompanyWishlist = extractDreamCompanies(answers.dreamCompanies);

  return {
    summary: normalizeText(answers.biggestAchievement)
      ? `Strongest signal: ${normalizeText(answers.biggestAchievement).slice(0, 160)}`
      : "Candidate shows a blend of technical depth, ambition, and clarity about preferred work.",
    hardSkills: hardSkills.length ? hardSkills : [{ name: "Problem Solving", weight: 70 }],
    softSkills: softSkills.length ? softSkills : [{ name: "Ownership", weight: 72 }],
    ambitionScore,
    cultureFitPreferences: cultureFitPreferences.length ? cultureFitPreferences : ["High ownership", "Builder culture"],
    salaryConfidenceScore,
    dreamCompanyWishlist,
    salaryTargetText: normalizeText(answers.yesSalary),
    salaryTargetValue,
  };
};

const buildPrompt = (answers) => {
  return `You are HireFlow AI. Analyze this candidate interview and produce a Career DNA JSON profile.

Interview answers:
- Biggest achievement: ${normalizeText(answers.biggestAchievement)}
- Flow state work: ${normalizeText(answers.flowWork)}
- Salary yes immediately: ${normalizeText(answers.yesSalary)}
- Dream companies: ${normalizeText(answers.dreamCompanies)}
- Strongest skills: ${normalizeText(answers.strongestSkills)}
- Ideal environment: ${normalizeText(answers.idealEnvironment)}

Return strict JSON with:
{
  "summary": "string",
  "hardSkills": [{"name":"string","weight":0-100}],
  "softSkills": [{"name":"string","weight":0-100}],
  "ambitionScore": 0-100,
  "cultureFitPreferences": ["string"],
  "salaryConfidenceScore": 0-100,
  "dreamCompanyWishlist": ["string"],
  "salaryTargetText": "string",
  "salaryTargetValue": number|null
}

Rules:
- Be truthful to the candidate's answers
- Keep hardSkills and softSkills to 4-6 items each
- Make culture preferences specific, not generic
- Do not invent companies the candidate did not mention
- Return JSON only`;
};

export const generateCareerDnaProfile = async (answers = {}) => {
  const normalizedAnswers = {
    biggestAchievement: normalizeText(answers.biggestAchievement),
    flowWork: normalizeText(answers.flowWork),
    yesSalary: normalizeText(answers.yesSalary),
    dreamCompanies: normalizeText(answers.dreamCompanies),
    strongestSkills: normalizeText(answers.strongestSkills),
    idealEnvironment: normalizeText(answers.idealEnvironment),
  };

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey) {
    return buildFallbackCareerDna(normalizedAnswers);
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await withServiceTimeout(
      () =>
        client.responses.create({
          model: process.env.OPENAI_MODEL || "gpt-5-mini",
          input: buildPrompt(normalizedAnswers),
        }),
      OPENAI_TIMEOUT_MS,
      "Career DNA generation timed out."
    );

    const rawText = String(response.output_text || "").trim();
    const parsed = JSON.parse(rawText);

    return {
      summary: normalizeText(parsed.summary),
      hardSkills: safeList((parsed.hardSkills || []).map((item) => item?.name)).map((name, index) => ({
        name,
        weight: clamp(Number(parsed.hardSkills?.[index]?.weight) || 70, 1, 100),
      })).slice(0, 6),
      softSkills: safeList((parsed.softSkills || []).map((item) => item?.name)).map((name, index) => ({
        name,
        weight: clamp(Number(parsed.softSkills?.[index]?.weight) || 70, 1, 100),
      })).slice(0, 6),
      ambitionScore: clamp(Number(parsed.ambitionScore) || 0, 0, 100),
      cultureFitPreferences: safeList(parsed.cultureFitPreferences || []).slice(0, 6),
      salaryConfidenceScore: clamp(Number(parsed.salaryConfidenceScore) || 0, 0, 100),
      dreamCompanyWishlist: safeList(parsed.dreamCompanyWishlist || []).slice(0, 8),
      salaryTargetText: normalizeText(parsed.salaryTargetText || normalizedAnswers.yesSalary),
      salaryTargetValue:
        Number.isFinite(Number(parsed.salaryTargetValue)) && Number(parsed.salaryTargetValue) > 0
          ? Number(parsed.salaryTargetValue)
          : parseSalaryValue(parsed.salaryTargetText || normalizedAnswers.yesSalary),
    };
  } catch (error) {
    console.error("Career DNA generation failed, using fallback:", error.message);
    return buildFallbackCareerDna(normalizedAnswers);
  }
};
