import RecruiterOutreach from "../models/RecruiterOutreach.js";

const PIXEL_BUFFER = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

export const markOutreachOpened = async (req, res) => {
  try {
    const { id } = req.params;

    const outreach = await RecruiterOutreach.findById(id);

    if (outreach && outreach.status !== "replied") {
      outreach.status = "opened";
      outreach.openedAt = outreach.openedAt || new Date();
      await outreach.save();
    }
  } catch (error) {
    console.error("Outreach open tracking failed:", error.message);
  }

  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return res.status(200).send(PIXEL_BUFFER);
};

export const markOutreachReplied = async (req, res) => {
  try {
    const { id } = req.params;

    const outreach = await RecruiterOutreach.findById(id);

    if (!outreach) {
      return res.status(404).json({
        success: false,
        message: "Outreach item not found.",
      });
    }

    outreach.status = "replied";
    outreach.repliedAt = new Date();
    await outreach.save();

    return res.status(200).json({
      success: true,
      message: "Outreach marked as replied.",
      outreach,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update outreach status.",
      error: error.message,
    });
  }
};

export const getOutreachForUser = async (req, res) => {
  try {
    const items = await RecruiterOutreach.find({ profileEmail: req.user.email }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load recruiter outreach.",
      error: error.message,
    });
  }
};
