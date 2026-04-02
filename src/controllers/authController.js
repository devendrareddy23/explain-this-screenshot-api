import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { applyReferralReward, ensureReferralCode } from "../services/referralService.js";
import { getHireFlowScoreProfile } from "../services/hireFlowScoreService.js";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      plan: "free",
      usageDate: "",
      resumeCount: 0,
      coverLetterCount: 0,
    });

    await ensureReferralCode(user);
    await applyReferralReward({ newUser: user, referralCode });

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        referralCode: user.referralCode,
        trialEndsAt: user.trialEndsAt,
        referralCreditsExpiresAt: user.referralCreditsExpiresAt,
        usageDate: user.usageDate,
        resumeCount: user.resumeCount,
        coverLetterCount: user.coverLetterCount,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register user.",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    await ensureReferralCode(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        referralCode: user.referralCode,
        trialEndsAt: user.trialEndsAt,
        referralCreditsExpiresAt: user.referralCreditsExpiresAt,
        usageDate: user.usageDate,
        resumeCount: user.resumeCount,
        coverLetterCount: user.coverLetterCount,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to login.",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const hireFlowScore = await getHireFlowScoreProfile({
      userId: req.user._id,
      profileEmail: req.user.email,
    });

    return res.status(200).json({
      success: true,
      user,
      hireFlowScore,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile.",
    });
  }
};

export const getMyHireFlowScore = async (req, res) => {
  try {
    const hireFlowScore = await getHireFlowScoreProfile({
      userId: req.user._id,
      profileEmail: req.user.email,
    });

    return res.status(200).json({
      success: true,
      hireFlowScore,
    });
  } catch (error) {
    console.error("Get HireFlow score error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate HireFlow score.",
    });
  }
};
