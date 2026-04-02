import UserPreference from "../models/UserPreference.js";
import { generateCareerDnaProfile } from "../services/careerDnaService.js";

const sanitizeList = (value) => {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

export const getMyPreferences = async (req, res) => {
  try {
    const preference = await UserPreference.findOne({ user: req.user._id });

    return res.status(200).json({
      success: true,
      preference:
        preference ||
        {
          preferredRoles: [],
          preferredLocations: [],
          workTypes: ["remote"],
          country: "in",
          minimumMatchScore: 80,
          expectedSalaryMin: null,
          companySizePreference: "any",
          careerInterviewAnswers: {
            biggestAchievement: "",
            flowWork: "",
            yesSalary: "",
            dreamCompanies: "",
            strongestSkills: "",
            idealEnvironment: "",
          },
          careerInterviewCompletedAt: null,
          careerDna: {
            summary: "",
            hardSkills: [],
            softSkills: [],
            ambitionScore: 0,
            cultureFitPreferences: [],
            salaryConfidenceScore: 0,
            dreamCompanyWishlist: [],
            salaryTargetText: "",
            salaryTargetValue: null,
          },
          candidateDiscovery: {
            enabled: false,
            headline: "",
          },
        },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load preferences.",
      error: error.message,
    });
  }
};

export const saveMyPreferences = async (req, res) => {
  try {
    const payload = {
      preferredRoles: sanitizeList(req.body?.preferredRoles),
      preferredLocations: sanitizeList(req.body?.preferredLocations),
      workTypes: sanitizeList(req.body?.workTypes),
      country: String(req.body?.country || "in").trim().toLowerCase() || "in",
      minimumMatchScore: Math.min(
        100,
        Math.max(1, Number(req.body?.minimumMatchScore) || 80)
      ),
      expectedSalaryMin:
        Number.isFinite(Number(req.body?.expectedSalaryMin)) && Number(req.body?.expectedSalaryMin) > 0
          ? Number(req.body?.expectedSalaryMin)
          : null,
      companySizePreference: ["any", "startup", "mid", "enterprise"].includes(String(req.body?.companySizePreference || "any"))
        ? String(req.body?.companySizePreference || "any")
        : "any",
      candidateDiscovery: {
        enabled: Boolean(req.body?.candidateDiscovery?.enabled),
        headline: String(req.body?.candidateDiscovery?.headline || "").trim(),
      },
    };

    const preference = await UserPreference.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        ...payload,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Preferences saved successfully.",
      preference,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save preferences.",
      error: error.message,
    });
  }
};

const sanitizeAnswer = (value) => String(value || "").trim();

export const saveCareerDnaInterview = async (req, res) => {
  try {
    const answers = {
      biggestAchievement: sanitizeAnswer(req.body?.biggestAchievement),
      flowWork: sanitizeAnswer(req.body?.flowWork),
      yesSalary: sanitizeAnswer(req.body?.yesSalary),
      dreamCompanies: sanitizeAnswer(req.body?.dreamCompanies),
      strongestSkills: sanitizeAnswer(req.body?.strongestSkills),
      idealEnvironment: sanitizeAnswer(req.body?.idealEnvironment),
    };

    if (!answers.biggestAchievement || !answers.flowWork || !answers.yesSalary || !answers.dreamCompanies) {
      return res.status(400).json({
        success: false,
        message: "Please complete the core Career DNA interview questions.",
      });
    }

    const careerDna = await generateCareerDnaProfile(answers);

    const preference = await UserPreference.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        careerInterviewAnswers: answers,
        careerInterviewCompletedAt: new Date(),
        careerDna,
        ...(careerDna.salaryTargetValue && !Number(req.body?.preserveExistingSalaryPreference)
          ? { expectedSalaryMin: careerDna.salaryTargetValue }
          : {}),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Career DNA profile created.",
      preference,
      careerDna,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create Career DNA profile.",
      error: error.message,
    });
  }
};
