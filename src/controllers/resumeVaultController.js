import User from "../models/User.js";

export const getResumeVault = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "masterResumeText masterResumeUpdatedAt"
    );

    return res.status(200).json({
      success: true,
      resume: {
        text: user?.masterResumeText || "",
        updatedAt: user?.masterResumeUpdatedAt || null,
        exists: Boolean(user?.masterResumeText),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load resume vault.",
      error: error.message,
    });
  }
};

export const saveResumeVault = async (req, res) => {
  try {
    const text = String(req.body?.resumeText || "").trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "resumeText is required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        masterResumeText: text,
        masterResumeUpdatedAt: new Date(),
      },
      {
        new: true,
      }
    ).select("masterResumeText masterResumeUpdatedAt");

    return res.status(200).json({
      success: true,
      message: "Master resume saved.",
      resume: {
        text: user?.masterResumeText || "",
        updatedAt: user?.masterResumeUpdatedAt || null,
        exists: Boolean(user?.masterResumeText),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save resume vault.",
      error: error.message,
    });
  }
};

export const deleteResumeVault = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      masterResumeText: "",
      masterResumeUpdatedAt: null,
    });

    return res.status(200).json({
      success: true,
      message: "Master resume deleted.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete resume vault.",
      error: error.message,
    });
  }
};
