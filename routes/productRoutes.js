const express = require("express");
const router = express.Router();
const multerErrorHandler = require("../middleware/uploadErrorHandler");
const upload = require("../middleware/upload");
const checkadmin = require("../middleware/checkAdmin");
const checkRole = require("../middleware/checkRole");
const securapi = require('../middleware/secureApi');

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
  getAdminProductWithVariants,
  togglePublishProduct,
} = require("../controllers/productController");


// Public
router.get("/", securapi, getAllProducts);
router.get("/:slug", securapi, getSingleProduct);

// Admin
router.get("/admin/products", checkadmin, checkRole("admin"), getAdminProducts);
router.post("/admin/createproduct", checkadmin, checkRole("admin"), createProduct);
router.put("/admin/updateproduct/:id", checkadmin, checkRole("admin"), updateProduct);
router.delete("/admin/deleteproduct/:id", checkadmin, checkRole("admin"), deleteProduct);
router.post("/admin/variant/:productId", checkadmin, checkRole("admin"), multerErrorHandler(upload.array("images", 5)), createProductVariant);
router.put("/admin/updatevariant/:id", checkadmin, checkRole("admin"), multerErrorHandler(upload.array("newImages", 5)), updateVariant);
router.delete("/admin/deletevariant/:id", checkadmin, checkRole("admin"), deleteVariant);



// Admin - get product with variants by ID
router.get("/admin/product/:id", checkadmin, checkRole("admin"), getAdminProductWithVariants);
router.patch("/admin/product/publish/:productId", checkadmin, checkRole("admin"), togglePublishProduct);



module.exports = router;
