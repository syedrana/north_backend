// const User = require("../../models/userModel"); // এটা যোগ করো
// const sendEmailVerification = require("../../utils/sendEmailVerification");

// const resendVerificationEmail = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // 🛑 ১️⃣ ইমেইল না থাকলে error
//     if (!email) {
//       return res.status(400).json({ success: false, message: "Email is required" });
//     }

//     // 🧠 ২️⃣ ইউজার খোঁজো
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     // ✅ ৩️⃣ যদি ইতিমধ্যে verified থাকে
//     if (user.isEmailVerified) {
//       return res.status(400).json({ success: false, message: "Email already verified" });
//     }

//     // ✉️ ৪️⃣ নতুন ভেরিফিকেশন লিংক পাঠাও
//     await sendEmailVerification(user);

//     return res.json({
//       success: true,
//       message: "Verification email resent successfully ✅",
//     });
//   } catch (error) {
//     console.error("Resend verification error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to resend verification email",
//     });
//   }
// };

// module.exports = resendVerificationEmail;










const User = require("../../models/userModel");
const sendEmailVerification = require("../../utils/sendEmailVerification");

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email already verified" });

    // 📨 Send new verification link
    await sendEmailVerification(user);

    return res.json({ success: true, message: "Verification email resent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ message: "Failed to resend verification" });
  }
};

module.exports = resendVerificationEmail;
