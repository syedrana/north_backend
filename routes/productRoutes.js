const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getSingleProduct,
  //getProductVariants,
  createProduct,
  createProductVariant,
} = require("../controllers/admin/productController");

// Public
router.get("/", getAllProducts);
router.get("/:slug", getSingleProduct);
//router.get("/:productId/variants", getProductVariants);

// Admin
router.post("/admin/createProduct", createProduct);
router.post("/admin/variant/:productId", createProductVariant);

module.exports = router;
