module.exports = (req, res, next) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: "imageUrl is required",
    });
  }

  if (typeof imageUrl !== "string") {
    return res.status(400).json({
      success: false,
      message: "imageUrl must be a string",
    });
  }

  next();
};
