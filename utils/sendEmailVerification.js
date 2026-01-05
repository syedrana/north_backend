  const jwt = require("jsonwebtoken");
  const sendEmail = require("./sendEmail");

  const sendEmailVerification = async (user) => {
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "5m",
    });

    const verifyUrl = `${process.env.BACKEND_BASE_URL}/verify-email?token=${token}`;

    const subject = "Verify Your Email - Haat Seba";
    const html = `
      <h3>Hello ${user.firstName},</h3>
      <p>Click the link below to verify your email:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail(user.email, subject, html);
  };

  module.exports = sendEmailVerification;
