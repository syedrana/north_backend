const router = require("express").Router();
const ctrl = require("../controllers/admin/searchAnalyticsController");
const optionalAuthGuard = require("../middleware/optionalAuth");

// User
router.post("/track", optionalAuthGuard, ctrl.trackSearch);
router.patch("/track-click", optionalAuthGuard, ctrl.updateClickedProduct);

router.get("/dashboard", ctrl.getDashboard);

router.get("/overview", ctrl.getOverview);
router.get("/keywords", ctrl.getKeywordAnalytics);
router.get("/sessions", ctrl.getSessions);

module.exports = router;