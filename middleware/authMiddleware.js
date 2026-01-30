const jwt = require("jsonwebtoken");
const User = require("../models/customer");

const authGuard = async (req, res, next) => {
  try {
    // 🔐 cookie থেকে token নাও
    const token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // 🔎 verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👤 user fetch (latest data)
    const user = await User.findById(decoded.id).select(
      "_id firstName lastName email phone role isBlocked"
    );

    if (!user || user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // ✅ req.user attach
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authGuard;
