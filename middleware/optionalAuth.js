const jwt = require("jsonwebtoken");
const User = require("../models/customer");

const optionalAuthGuard = async (req, res, next) => {
  try {
    let token = null;

    // ১. টোকেন সোর্স চেক করা (কুকি বা হেডার)
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ২. যদি কোনো টোকেন না পাওয়া যায়, তবে গেস্ট হিসেবে সামনে এগিয়ে যাও
    if (!token) {
      return next();
    }

    /* ================= টোকেন থাকলে ভেরিফাই করা হবে ================= */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "_id firstName lastName email phone role isBlocked"
    );

    // যদি ইউজার পাওয়া যায় এবং সে ব্লক না থাকে, তবেই req.user-এ ডাটা রাখা হবে
    if (user && !user.isBlocked) {
      req.user = user;
    }

    // ৩. সবকিছু ঠিকঠাক থাকলে বা ইউজার না থাকলেও পরের স্টেপে পাঠিয়ে দিবে
    next();
  } catch (error) {
    // টোকেন যদি এক্সপায়ার হয়ে যায় বা ইনভ্যালিড হয়, তাহলেও এরর না দিয়ে গেস্ট হিসেবে ট্রিট করবে
    console.error("OptionalAuthGuard error (Silent):", error.message);
    next();
  }
};

module.exports = optionalAuthGuard;