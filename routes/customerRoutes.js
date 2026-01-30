const express = require("express");
const securapi = require('../middleware/secureApi');

const router = express.Router();

const register  = require("../controllers/customer/registrationController");
const login = require("../controllers/customer/loginController");
const {getMe, logoutUser} = require("../controllers/customer/authController");

router.post("/register", securapi, register);
router.post("/login", securapi, login);
router.get("/me", securapi, getMe);
router.post("/logout", securapi, logoutUser);

module.exports = router;
