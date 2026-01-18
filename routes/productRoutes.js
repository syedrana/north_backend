const express = require("express");
const router = express.Router();
const multerErrorHandler = require("../middleware/uploadErrorHandler");
const upload = require("../middleware/upload");
const checkadmin = require("../middleware/checkAdmin");
const checkRole = require("../middleware/checkRole");

const {
  getAllProducts,
  getSingleProduct,
  getAdminProducts,
  createProduct,
  updateProduct, 
  deleteProduct,
  createProductVariant,
  updateVariant,
  deleteVariant,
} = require("../controllers/productController");


// Public
router.get("/", getAllProducts);
router.get("/:slug", getSingleProduct);

// Admin
router.get("/admin/products", checkadmin, checkRole("admin"), getAdminProducts);
router.post("/admin/createproduct", checkadmin, checkRole("admin"), createProduct);
router.put("/admin/updateproduct/:id", checkadmin, checkRole("admin"), updateProduct);
router.delete("/admin/deleteproduct/:id", checkadmin, checkRole("admin"), deleteProduct);
router.post("/admin/variant/:productId", checkadmin, checkRole("admin"), multerErrorHandler(upload.single("image")), createProductVariant);
router.put("/admin/updatevariant/:id", checkadmin, checkRole("admin"), updateVariant);
router.delete("/admin/deletevariant/:id", checkadmin, checkRole("admin"), deleteVariant);

module.exports = router;
