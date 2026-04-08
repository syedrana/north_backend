const express = require("express");
const securapi = require("../middleware/secureApi");
const { getHomepageTrendingProducts } = require("../controllers/trendingProductsController");

const router = express.Router();

// Public
router.get("/", securapi, getHomepageTrendingProducts);

module.exports = router;
