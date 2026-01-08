const express = require("express");
const router = express.Router();
const multerErrorHandler = require("../middleware/uploadErrorHandler");
const upload = require("../middleware/upload");

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
router.post("/admin/variant/:productId", multerErrorHandler(upload.single("image")), createProductVariant);

module.exports = router;
