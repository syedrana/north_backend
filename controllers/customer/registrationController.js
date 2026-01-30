const User = require("../../models/customer");
const generateToken = require("../../utils/generateToken");

const register = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
    } = req.body;

    // 1️⃣ Basic required check (extra safety)
    if (!firstName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // 2️⃣ Check existing user (email OR phone)
    const userExists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or phone",
      });
    }

    // 3️⃣ Create user (password hash auto হবে schema middleware দিয়ে)
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    // 4️⃣ Send response
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = register;