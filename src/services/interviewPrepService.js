import OpenAI from "openai";
import { OPENAI_TIMEOUT_MS, withServiceTimeout } from "./serviceTimeouts.js";

const TECH_KEYWORDS = [
  "Node.js",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "AWS",
  "Docker",
  "Kubernetes",
  "Python",
  "Java",
  "Go",
  "GraphQL",
  "REST APIs",
  "Microservices",
  "CI/CD",
  "Distributed Systems",
  "System Design",
];

const HEDGE_WORDS = ["maybe", "kind of", "sort of", "probably", "i think", "i guess"];

const normalizeText = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const uniqueList = (items = []) => [...new Set(items.map((item) => normalizeText(item)).filter(Boolean))];
const pickList = (items = [], count = 3) => uniqueList(items).slice(0, count);

const getOpenAIClient = () => {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
};

const splitResumeLines = (resumeText = "") =>
  String(resumeText || "")
    .split(/\.|\n|•|-/)
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 20);

const extractTechSignals = ({ job, companyIntelligence }) => {
  const description = `${job?.title || ""} ${job?.description || ""}`.toLowerCase();
  const inferred = TECH_KEYWORDS.filter((item) => description.includes(item.toLowerCase()));
  return pickList([...(companyIntelligence?.techStack || []), ...inferred], 6);
};

const buildCultureSignals = ({ companyIntelligence, careerDna }) => {
  const signals = [];
  if (companyIntelligence?.growthSignal) signals.push(companyIntelligence.growthSignal);
  if (companyIntelligence?.interviewProcess?.summary) signals.push(companyIntelligence.interviewProcess.summary);
  if (Array.isArray(careerDna?.cultureFitPreferences)) {
    signals.push(...careerDna.cultureFitPreferences.map((item) => `${item} environment`));
  }
  return pickList(signals, 5);
};

const buildThingsToKnow = ({ job, companyIntelligence, careerDna }) => {
  const items = [];
  items.push(`${job?.company || "This company"} is hiring for ${job?.title || "this role"}, so expect questions about role-specific execution and ownership.`);
  if (companyIntelligence?.growthSignal) items.push(companyIntelligence.growthSignal);
  if (companyIntelligence?.timeToHire?.label) items.push(`Hiring pace looks like ${companyIntelligence.timeToHire.label}.`);
  if (companyIntelligence?.salaryInsight?.label) items.push(`Compensation signal: ${companyIntelligence.salaryInsight.label}.`);
  if (Array.isArray(companyIntelligence?.techStack) && companyIntelligence.techStack.length) {
    items.push(`Core stack signals from the job post: ${companyIntelligence.techStack.slice(0, 5).join(", ")}.`);
  }
  if (
    Array.isArray(careerDna?.dreamCompanyWishlist) &&
    careerDna.dreamCompanyWishlist.some((item) => item.toLowerCase() === String(job?.company || "").toLowerCase())
  ) {
    items.push(`${job?.company || "This company"} already appears in your dream-company wishlist, so bring real enthusiasm to the conversation.`);
  }
  return pickList(items, 5);
};

const buildExperienceStories = ({ resumeText, careerDna, job }) => {
  const lines = splitResumeLines(resumeText);
  const stories = [];

  if (normalizeText(careerDna?.summary)) {
    stories.push({
      title: "Your strongest value story",
      talkTrack: normalizeText(careerDna.summary),
    });
  }

  if (normalizeText(careerDna?.salaryTargetText)) {
    stories.push({
      title: "How you assess impact and scope",
      talkTrack: `Frame your experience around the level of ownership that justifies ${careerDna.salaryTargetText} and connect it to outcomes you have already delivered.`,
    });
  }

  for (const line of lines.slice(0, 4)) {
    stories.push({
      title: job?.title ? `Relevant story for ${job.title}` : "Relevant career story",
      talkTrack: line,
    });
  }

  return stories.slice(0, 3);
};

const buildQuestionsToAsk = ({ job, companyIntelligence }) => {
  const questions = [
    `What does success look like in the first 90 days for the ${job?.title || "role"}?`,
    "What are the hardest technical or operational challenges this team is solving right now?",
    "How does the team make decisions when speed and quality are in tension?",
  ];

  if (Array.isArray(companyIntelligence?.recentNews) && companyIntelligence.recentNews.length) {
    questions.push(`How is the team adapting to ${companyIntelligence.recentNews[0].title}?`);
  } else {
    questions.push("How has the company evolved over the last 12 months, and what does that mean for this team?");
  }

  questions.push("What traits separate the people who thrive here from those who struggle?");
  return pickList(questions, 5);
};

const buildSalaryScript = ({ companyIntelligence, careerDna }) => {
  const target =
    normalizeText(careerDna?.salaryTargetText) ||
    companyIntelligence?.salaryInsight?.label ||
    "a competitive range";

  return `I’m most excited about the scope and impact of this role. Based on the responsibilities, the market signal, and the outcomes I’ve delivered in similar work, I’d be comfortable discussing a package around ${target}. If the overall role and growth path are strong, I’m happy to work through the details together.`;
};

const buildFallbackQuestions = ({ job, companyIntelligence, careerDna }) => {
  const techStack = extractTechSignals({ job, companyIntelligence });
  const cultureSignals = buildCultureSignals({ companyIntelligence, careerDna });
  const newsTitle = companyIntelligence?.recentNews?.[0]?.title || `${job?.company || "the company"}'s recent momentum`;

  return {
    technical: [
      {
        question: `Walk me through how you would solve a real problem using ${techStack[0] || "the core stack in this role"}.`,
        why: "Interviewers will want proof that you can work inside the stack named in the job post.",
      },
      {
        question: "Tell me about a system you improved for scale, reliability, or performance.",
        why: "This role appears to value hands-on problem solving and engineering judgment.",
      },
      {
        question: "How do you debug ambiguity when requirements are incomplete or systems are failing?",
        why: "This reveals technical depth and calm decision-making under pressure.",
      },
    ],
    behavioral: [
      {
        question: "Tell me about a time you took ownership beyond your formal job description.",
        why: `The company signals point toward ${cultureSignals[0] || "high ownership"}.`,
      },
      {
        question: "Describe a difficult stakeholder or team alignment problem and how you handled it.",
        why: "Behavioral questions will test collaboration and communication, not just technical skill.",
      },
      {
        question: "What kind of work gives you energy, and how does that show up in your best projects?",
        why: "This helps you tie your Career DNA to the role in a credible way.",
      },
    ],
    companyNews: [
      {
        question: `What stands out to you about ${job?.company || "this company"} right now, and why do you want to join at this moment?`,
        why: "Interviewers want proof that your interest is specific, not generic.",
      },
      {
        question: `How would you contribute if the company continues pushing on ${newsTitle}?`,
        why: "Recent company momentum is a natural way for interviewers to test your judgment and curiosity.",
      },
    ],
  };
};

const buildFallbackPrep = ({
  application,
  job,
  companyIntelligence,
  careerDna,
  resumeText,
  interviewScheduledAt = null,
}) => {
  const fiveThingsToKnow = buildThingsToKnow({ job, companyIntelligence, careerDna });
  const recentNewsSignals = pickList((companyIntelligence?.recentNews || []).map((item) => item?.title), 3);
  const techStackSignals = extractTechSignals({ job, companyIntelligence });
  const cultureSignals = buildCultureSignals({ companyIntelligence, careerDna });

  return {
    title: application?.title || job?.title || "",
    company: application?.company || job?.company || "",
    interviewScheduledAt,
    jobDescription: normalizeText(job?.description || application?.description || ""),
    companySnapshot: {
      headline: `You have an interview at ${application?.company || job?.company || "this company"}. Here is your complete prep guide.`,
      fiveThingsToKnow,
      recentNewsSignals,
      techStackSignals,
      cultureSignals,
    },
    likelyQuestions: buildFallbackQuestions({ job, companyIntelligence, careerDna }),
    preInterviewBrief: {
      intro: `You’re interviewing for ${application?.title || job?.title || "this role"} at ${application?.company || job?.company || "the company"}. Focus on clear impact stories, role-relevant technical depth, and why this company is a fit right now.`,
      fiveThingsToKnow,
      experienceStories: buildExperienceStories({ resumeText, careerDna, job }),
      questionsToAsk: buildQuestionsToAsk({ job, companyIntelligence }),
      salaryNegotiationScript: buildSalaryScript({ companyIntelligence, careerDna }),
    },
    generatedAt: new Date(),
  };
};

const sanitizeQuestionGroups = (groups = {}) => ({
  technical: (Array.isArray(groups.technical) ? groups.technical : [])
    .map((item) => ({
      question: normalizeText(item?.question),
      why: normalizeText(item?.why),
    }))
    .filter((item) => item.question)
    .slice(0, 5),
  behavioral: (Array.isArray(groups.behavioral) ? groups.behavioral : [])
    .map((item) => ({
      question: normalizeText(item?.question),
      why: normalizeText(item?.why),
    }))
    .filter((item) => item.question)
    .slice(0, 5),
  companyNews: (Array.isArray(groups.companyNews) ? groups.companyNews : [])
    .map((item) => ({
      question: normalizeText(item?.question),
      why: normalizeText(item?.why),
    }))
    .filter((item) => item.question)
    .slice(0, 5),
});

const buildPrepPrompt = ({ application, job, companyIntelligence, careerDna, resumeText, interviewScheduledAt }) => `You are HireFlow AI, an elite interview strategist.

Prepare an interview prep package for this candidate.

Candidate context:
- Resume excerpt: ${normalizeText(resumeText).slice(0, 3000)}
- Career DNA summary: ${normalizeText(careerDna?.summary)}
- Hard skills: ${(careerDna?.hardSkills || []).map((item) => item?.name).filter(Boolean).join(", ")}
- Culture preferences: ${(careerDna?.cultureFitPreferences || []).join(", ")}

Interview target:
- Job title: ${normalizeText(application?.title || job?.title)}
- Company: ${normalizeText(application?.company || job?.company)}
- Job description: ${normalizeText(job?.description || application?.description).slice(0, 5000)}
- Interview scheduled at: ${interviewScheduledAt ? new Date(interviewScheduledAt).toISOString() : "Not provided"}

Company intelligence:
- Growth/news: ${normalizeText(companyIntelligence?.growthSignal)}
- Recent news: ${(companyIntelligence?.recentNews || []).map((item) => item?.title).filter(Boolean).join(" | ")}
- Tech stack: ${(companyIntelligence?.techStack || []).join(", ")}
- Time to hire: ${normalizeText(companyIntelligence?.timeToHire?.label)}
- Recruiter context: ${normalizeText(companyIntelligence?.recruiter?.recruiterName || companyIntelligence?.recruiter?.recruiterEmail)}
- Interview process note: ${normalizeText(companyIntelligence?.interviewProcess?.summary)}

Return strict JSON only in this shape:
{
  "companySnapshot": {
    "headline": "string",
    "fiveThingsToKnow": ["string", "string", "string", "string", "string"],
    "recentNewsSignals": ["string"],
    "techStackSignals": ["string"],
    "cultureSignals": ["string"]
  },
  "likelyQuestions": {
    "technical": [{"question": "string", "why": "string"}],
    "behavioral": [{"question": "string", "why": "string"}],
    "companyNews": [{"question": "string", "why": "string"}]
  },
  "preInterviewBrief": {
    "intro": "string",
    "fiveThingsToKnow": ["string", "string", "string", "string", "string"],
    "experienceStories": [{"title": "string", "talkTrack": "string"}],
    "questionsToAsk": ["string"],
    "salaryNegotiationScript": "string"
  }
}

Rules:
- Be concrete and specific to the company and role
- Keep everything truthful to the provided resume and company data
- Do not invent unverified news, recruiter details, or interview process steps
- Questions should be realistic and useful
- Include exactly 5 items in both fiveThingsToKnow arrays
- Include exactly 3 experienceStories
- Return JSON only`;

export const generateInterviewPrep = async ({
  application,
  job,
  companyIntelligence = null,
  careerDna = null,
  resumeText = "",
  interviewScheduledAt = null,
}) => {
  const fallback = buildFallbackPrep({
    application,
    job,
    companyIntelligence,
    careerDna,
    resumeText,
    interviewScheduledAt,
  });

  const client = getOpenAIClient();
  if (!client) {
    return fallback;
  }

  try {
    const response = await withServiceTimeout(
      () =>
        client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.45,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Return valid JSON only. Be specific, credible, and helpful. Never invent unavailable facts.",
            },
            {
              role: "user",
              content: buildPrepPrompt({ application, job, companyIntelligence, careerDna, resumeText, interviewScheduledAt }),
            },
          ],
        }),
      OPENAI_TIMEOUT_MS,
      "Interview prep generation timed out."
    );

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const likelyQuestions = sanitizeQuestionGroups(parsed?.likelyQuestions || {});
    const experienceStories = Array.isArray(parsed?.preInterviewBrief?.experienceStories)
      ? parsed.preInterviewBrief.experienceStories
          .map((item) => ({
            title: normalizeText(item?.title),
            talkTrack: normalizeText(item?.talkTrack),
          }))
          .filter((item) => item.title || item.talkTrack)
          .slice(0, 3)
      : [];

    return {
      ...fallback,
      companySnapshot: {
        headline: normalizeText(parsed?.companySnapshot?.headline) || fallback.companySnapshot.headline,
        fiveThingsToKnow: pickList(parsed?.companySnapshot?.fiveThingsToKnow || fallback.companySnapshot.fiveThingsToKnow, 5),
        recentNewsSignals: pickList(parsed?.companySnapshot?.recentNewsSignals || fallback.companySnapshot.recentNewsSignals, 3),
        techStackSignals: pickList(parsed?.companySnapshot?.techStackSignals || fallback.companySnapshot.techStackSignals, 6),
        cultureSignals: pickList(parsed?.companySnapshot?.cultureSignals || fallback.companySnapshot.cultureSignals, 5),
      },
      likelyQuestions: {
        technical: likelyQuestions.technical.length ? likelyQuestions.technical : fallback.likelyQuestions.technical,
        behavioral: likelyQuestions.behavioral.length ? likelyQuestions.behavioral : fallback.likelyQuestions.behavioral,
        companyNews: likelyQuestions.companyNews.length ? likelyQuestions.companyNews : fallback.likelyQuestions.companyNews,
      },
      preInterviewBrief: {
        intro: normalizeText(parsed?.preInterviewBrief?.intro) || fallback.preInterviewBrief.intro,
        fiveThingsToKnow: pickList(parsed?.preInterviewBrief?.fiveThingsToKnow || fallback.preInterviewBrief.fiveThingsToKnow, 5),
        experienceStories: experienceStories.length ? experienceStories : fallback.preInterviewBrief.experienceStories,
        questionsToAsk: pickList(parsed?.preInterviewBrief?.questionsToAsk || fallback.preInterviewBrief.questionsToAsk, 5),
        salaryNegotiationScript:
          normalizeText(parsed?.preInterviewBrief?.salaryNegotiationScript) || fallback.preInterviewBrief.salaryNegotiationScript,
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("Interview prep generation failed, using fallback:", error.message);
    return fallback;
  }
};

const buildFallbackEvaluation = ({ question, answer, job }) => {
  const answerText = normalizeText(answer);
  const wordCount = answerText ? answerText.split(/\s+/).length : 0;
  const answerLower = answerText.toLowerCase();
  const questionTerms = uniqueList(
    normalizeText(question)
      .toLowerCase()
      .split(/[^a-z0-9+.#]+/)
      .filter((item) => item.length > 3)
  );
  const jobTerms = uniqueList(
    `${job?.title || ""} ${job?.description || ""}`
      .toLowerCase()
      .split(/[^a-z0-9+.#]+/)
      .filter((item) => item.length > 4)
  ).slice(0, 24);
  const overlapCount = uniqueList([...questionTerms, ...jobTerms]).filter((term) => answerLower.includes(term)).length;
  const clarity = clamp(45 + Math.min(wordCount, 180) * 0.25, 35, 92);
  const confidencePenalty = HEDGE_WORDS.reduce((total, word) => total + (answerLower.includes(word) ? 6 : 0), 0);
  const confidence = clamp(68 - confidencePenalty + (wordCount >= 60 ? 10 : 0), 35, 94);
  const relevance = clamp(40 + overlapCount * 8 + (answerLower.includes("impact") ? 8 : 0), 30, 95);
  const overall = Math.round((confidence + clarity + relevance) / 3);

  return {
    summary:
      wordCount < 35
        ? "Your answer has a good direction, but it needs more specifics and evidence to feel interview-ready."
        : "This answer is moving in the right direction. Tighten the structure and connect the story more directly to the role.",
    strengths: pickList(
      [
        wordCount >= 40
          ? "You gave enough context to start building a credible answer."
          : "You answered directly instead of avoiding the question.",
        overlapCount >= 2
          ? "You referenced role-relevant signals from the question or job context."
          : "You have the right raw material; now it needs stronger tailoring.",
        answerLower.includes("led") || answerLower.includes("built") || answerLower.includes("improved")
          ? "Action verbs made your contribution clearer."
          : "There is room to make your ownership more explicit.",
      ],
      3
    ),
    improvements: pickList(
      [
        wordCount < 60
          ? "Add one concrete example, metric, or before-and-after result."
          : "Lead with the outcome earlier so the interviewer hears the impact first.",
        overlapCount < 2
          ? "Use more language from the job description so the relevance is unmistakable."
          : "Tie the example back to why it matters for this exact team.",
        confidence < 65
          ? "Replace hedging with clear ownership statements about what you did and why it worked."
          : "Keep your pacing confident and avoid over-explaining details that do not strengthen the answer.",
      ],
      3
    ),
    sampleUpgrade: `A stronger version would open with the result, explain the challenge, then clearly state what you personally drove and how that maps to ${job?.title || "this role"}.`,
    scores: {
      confidence,
      clarity: Math.round(clarity),
      relevance,
      overall,
    },
  };
};

const buildEvaluationPrompt = ({ question, answer, job, prep }) => `You are HireFlow AI, acting as an expert interview coach.

Interview question: ${normalizeText(question)}
Candidate answer: ${normalizeText(answer)}
Job title: ${normalizeText(job?.title)}
Company: ${normalizeText(job?.company)}
Job description: ${normalizeText(job?.description).slice(0, 3000)}
Prep signals:
- Tech stack: ${(prep?.companySnapshot?.techStackSignals || []).join(", ")}
- Culture signals: ${(prep?.companySnapshot?.cultureSignals || []).join(", ")}
- Stories prepared: ${(prep?.preInterviewBrief?.experienceStories || []).map((item) => item?.title).filter(Boolean).join(", ")}

Return strict JSON only in this shape:
{
  "summary": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "sampleUpgrade": "string",
  "scores": {
    "confidence": 0-100,
    "clarity": 0-100,
    "relevance": 0-100,
    "overall": 0-100
  }
}

Rules:
- Be specific and constructive
- Keep the feedback direct and useful
- Do not flatter without evidence
- Score based on confidence, clarity, and relevance to the role
- Return JSON only`;

export const evaluateInterviewAnswer = async ({ question, answer, job, prep }) => {
  const fallback = buildFallbackEvaluation({ question, answer, job });
  const client = getOpenAIClient();

  if (!client) {
    return fallback;
  }

  try {
    const response = await withServiceTimeout(
      () =>
        client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.35,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "Return valid JSON only. Be direct, specific, and useful.",
            },
            {
              role: "user",
              content: buildEvaluationPrompt({ question, answer, job, prep }),
            },
          ],
        }),
      OPENAI_TIMEOUT_MS,
      "Interview answer evaluation timed out."
    );

    const raw = response.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    return {
      summary: normalizeText(parsed?.summary) || fallback.summary,
      strengths: pickList(parsed?.strengths || fallback.strengths, 3),
      improvements: pickList(parsed?.improvements || fallback.improvements, 3),
      sampleUpgrade: normalizeText(parsed?.sampleUpgrade) || fallback.sampleUpgrade,
      scores: {
        confidence: clamp(Number(parsed?.scores?.confidence) || fallback.scores.confidence, 0, 100),
        clarity: clamp(Number(parsed?.scores?.clarity) || fallback.scores.clarity, 0, 100),
        relevance: clamp(Number(parsed?.scores?.relevance) || fallback.scores.relevance, 0, 100),
        overall: clamp(Number(parsed?.scores?.overall) || fallback.scores.overall, 0, 100),
      },
    };
  } catch (error) {
    console.error("Interview answer evaluation failed, using fallback:", error.message);
    return fallback;
  }
};
