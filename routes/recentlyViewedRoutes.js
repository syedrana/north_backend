const express = require("express");
const securapi = require("../middleware/secureApi");
const optionalAuth = require("../middleware/optionalAuth");
const { getRecentlyViewed, trackRecentlyViewed } = require("../controllers/recentlyViewedController");

const router = express.Router();

router.post("/track-view", securapi, optionalAuth, trackRecentlyViewed);
router.get("/", securapi, optionalAuth, getRecentlyViewed);

module.exports = router;
