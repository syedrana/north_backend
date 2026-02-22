const router = require("express").Router();
const ctrl = require("../controllers/admin/searchAnalyticsController");
const optionalAuthGuard = require("../middleware/optionalAuth");

router.post("/track", optionalAuthGuard, ctrl.trackSearch);
router.patch("/track-click", optionalAuthGuard, ctrl.updateClickedProduct);

router.get("/dashboard", ctrl.getDashboard);

module.exports = router;