  // const jwt = require("jsonwebtoken");
  // const User = require("../../models/userModel");

  // const verifyEmail = async (req, res) => {
  //   try {
  //     const { token } = req.query;
  //     if (!token) {
  //       return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=missing`);
  //     }

  //     // ✅ টোকেন যাচাই
  //     const decoded = jwt.verify(token, process.env.JWT_SECRET);

  //     // ✅ ইউজার খুঁজে বের করা
  //     const user = await User.findById(decoded.userId);
  //     if (!user) {
  //       return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=invalid-user`);
  //     }

  //     // ✅ যদি আগেই ভেরিফাই হয়ে থাকে
  //     if (user.isEmailVerified) {
  //       return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verified`);
  //     }

  //     // ✅ এখন ভেরিফাই করে দাও
  //     user.isEmailVerified = true;
  //     await user.save();

  //     return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verified`);
  //   } catch (error) {
  //     console.error("Email verification error:", error);

  //     // ✅ যদি টোকেন এক্সপায়ার হয়ে যায়
  //     if (error.name === "TokenExpiredError") {
  //       const decoded = jwt.decode(req.query.token); // verify নয়
  //       const userEmail = decoded?.email || "";
  //       return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=expired&email=${encodeURIComponent(userEmail)}`);
  //     }

  //     // ✅ অন্য কোনো কারণে ব্যর্থ
  //     return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=invalid`);
  //   }
  // };

  // module.exports = verifyEmail;












  const jwt = require("jsonwebtoken");
const User = require("../../models/userModel");

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=missing`);
    }

    // ✅ টোকেন যাচাই
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ ইউজার খুঁজে বের করা
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=invalid-user`);
    }

    // ✅ যদি আগেই ভেরিফাই হয়ে থাকে
    if (user.isEmailVerified) {
      return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verified`);
    }

    // ✅ এখন ভেরিফাই করে দাও
    user.isEmailVerified = true;
    await user.save();

    return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verified`);
  } catch (error) {
    console.error("Email verification error:", error);

    // ✅ যদি টোকেন এক্সপায়ার হয়ে যায়
    if (error.name === "TokenExpiredError") {
      // decode করে userId বের করা
      const decoded = jwt.decode(req.query.token);
      let userEmail = "";
      if (decoded?.userId) {
        const user = await User.findById(decoded.userId);
        if (user) userEmail = user.email;
      }
      return res.redirect(
        `${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=expired&email=${encodeURIComponent(userEmail)}`
      );
    }

    // ✅ অন্য কোনো কারণে ব্যর্থ
    return res.redirect(`${process.env.FRONTEND_BASE_URL}/email-verification-failed?reason=invalid`);
  }
};

module.exports = verifyEmail;
