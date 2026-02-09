// const User = require("../../models/userModel");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcrypt");

// let login = async (req, res) => {
//   try {
//     const { identifier, password } = req.body;

//     // 🔹 identifier মানে: Email বা Referral Code — যেকোনোটা
//     if (!identifier) {
//       return res.status(400).send("Email or Referral Code is required");
//     }

//     if (!password) {
//       return res.status(400).send("Password is required");
//     }

//     // 🔹 Email বা Referral Code দিয়ে ইউজার খোঁজা
//     let existingUser = await User.findOne({
//       $or: [
//         { email: identifier.toLowerCase() },
//         { referralCode: identifier.toUpperCase() },
//       ],
//     }).select("+password");

//     if (!existingUser) {
//       return res.status(400).send("Invalid credentials");
//     }

//     // ✅ Check if user is email verification
//     // if (!existingUser.isVerified) {
//     //     return res.status(400).send("Your account is pending Email Verification.");
//     // } 

//     // ✅ Check if user is approved by admin
//     if (!existingUser.isApproved) {
//       return res.status(400).send("Your account is pending admin approval.");
//     }

//     // ✅ Password match check
//     const isMatch = await bcrypt.compare(password, existingUser.password);
//     if (!isMatch) {
//       return res.status(400).send("Invalid credentials");
//     }

//     // ✅ JWT টোকেন তৈরি
//     const token = jwt.sign(
//       {
//         username: `${existingUser.firstName} ${existingUser.lastName}`,
//         userid: existingUser._id,
//         role: existingUser.role,
//         referralCode: existingUser.referralCode,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: "23h",
//       }
//     );

//     // ✅ Successful Login Response
//     res.status(200).json({
//       access_token: token,
//       message: "Login Successful",
//       role: existingUser.role,
//       referralCode: existingUser.referralCode,
//       name: `${existingUser.firstName} ${existingUser.lastName}`,
//       image: existingUser.image,
//     });
//   } catch (error) {
//     console.error("Login Error:", error.message);
//     // ❌ এখানে ছোট ভুল ছিল — res.status(400).status(...)
//     res.status(500).send("Internal Server Error");
//   }
// };

// module.exports = login;

// const User = require("../../models/customer");
// const generateToken = require("../../utils/generateToken");
// const Cart = require("../../models/cart");
// const ProductVariant = require("../../models/productVariant");

// /**
//  * 🔐 User Login
//  */
// const loginUser = async (req, res) => {
//   try {
//     const { emailOrPhone, password } = req.body;

//     if (!emailOrPhone || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email/Phone and password are required",
//       });
//     }

//     const user = await User.findOne({
//       $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
//     }).select("+password");

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     if (user.isBlocked) {
//       return res.status(403).json({
//         success: false,
//         message: "Account is blocked",
//       });
//     }

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const token = generateToken(user);

//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     res.json({
//       success: true,
//       message: "Login successful",
//       user: {
//         id: user._id,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         email: user.email,
//         phone: user.phone,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// module.exports = loginUser;









const { mergeGuestCart } = require("../../helpers/mergeGuestCart");


const User = require("../../models/customer");
const generateToken = require("../../utils/generateToken");

const loginUser = async (req, res) => {
  try {
    const { emailOrPhone, password, guestCart = [] } = req.body;

    /* ================= VALIDATION ================= */
    if (!emailOrPhone || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Phone and password are required",
      });
    }

    /* ================= USER CHECK ================= */
    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    /* ================= CART MERGE ================= */
    if (guestCart.length > 0) {
      await mergeGuestCart(user._id, guestCart);
    }

    /* ================= TOKEN ================= */
    const token = generateToken(user);

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });


    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = loginUser;



