const requireActivePro = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authorized."
    });
  }

  if (req.user.plan !== "pro") {
    return res.status(403).json({
      success: false,
      message: "This feature is available only for Pro users."
    });
  }

  next();
};

export default requireActivePro;
