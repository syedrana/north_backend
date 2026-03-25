const express = require("express");
const checkAdmin = require("../middleware/checkAdmin");
const checkRole = require("../middleware/checkRole");
const {
  listAdminFlashSales,
  getAdminFlashSaleById,
  createAdminFlashSale,
  updateAdminFlashSale,
  deleteAdminFlashSale,
  getPublicActiveFlashSale,
} = require("../controllers/flashSaleController");

const router = express.Router();

router.get("/active", getPublicActiveFlashSale);

router.get("/admin", checkAdmin, checkRole("admin"), listAdminFlashSales);
router.get("/admin/:flashSaleId", checkAdmin, checkRole("admin"), getAdminFlashSaleById);
router.post("/admin", checkAdmin, checkRole("admin"), createAdminFlashSale);
router.put("/admin/:flashSaleId", checkAdmin, checkRole("admin"), updateAdminFlashSale);
router.delete("/admin/:flashSaleId", checkAdmin, checkRole("admin"), deleteAdminFlashSale);

module.exports = router;
