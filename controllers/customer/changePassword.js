const bcrypt = require("bcryptjs");
const User = require("../../models/userModel");

const changePassword = async (req, res) => {
  try {
    const userId = req.userid;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required!" });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect!" });
    }

    if (newPassword.length < 8 || newPassword.length > 16) {
      return res.status(400).json({ message: "Password must be 8-16 characters." });
    }

    // Reject leading/trailing spaces WITHOUT mutating the password
    if (/^\s|\s$/.test(newPassword)) {
      return res.status(400).json({ message: "Password cannot start or end with spaces." });
    }

    // Optional: strength/complexity rule (at least 1 lower, 1 upper, 1 digit, 1 symbol)
    const strongEnough = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,64}$/.test(newPassword);
    if (!strongEnough) {
      return res.status(400).json({
        message: "Password must include upper, lower, number, and symbol."
      });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: "Password changed successfully!" });

  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = changePassword;
