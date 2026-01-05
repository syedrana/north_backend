const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getSingleProduct,
  getProductVariants,
  createProduct,
  createProductVariant,
} = require("../controllers/productController");

// Public
router.get("/", getAllProducts);
router.get("/:slug", getSingleProduct);
router.get("/:productId/variants", getProductVariants);

// Admin
router.post("/admin", createProduct);
router.post("/admin/:productId/variant", createProductVariant);

module.exports = router;
