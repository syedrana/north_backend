const express = require("express");
const { getHomepage } = require("../controllers/homepageController");

const router = express.Router();

router.get("/", getHomepage);

module.exports = router;
