const express = require("express");
const securapi = require("../middleware/secureApi");
const optionalAuth = require("../middleware/optionalAuth");
const { getRecentlyViewed } = require("../controllers/recentlyViewedController");

const router = express.Router();

router.get("/", securapi, optionalAuth, getRecentlyViewed);

module.exports = router;
