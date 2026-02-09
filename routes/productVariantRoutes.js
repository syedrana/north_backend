const express = require("express");
const router = express.Router();
const multerErrorHandler = require("../middleware/uploadErrorHandler");
const upload = require("../middleware/upload");
const checkadmin = require("../middleware/checkAdmin");
const checkRole = require("../middleware/checkRole");

const {
  createProductVariant,
  updateVariant,
  deleteVariant,
} = require("../controllers/productVariantController");


router.post("/admin/variant/:productId", checkadmin, checkRole("admin"), multerErrorHandler(upload.array("images", 5)), createProductVariant);
router.put("/admin/updatevariant/:id", checkadmin, checkRole("admin"), multerErrorHandler(upload.array("newImages", 5)), updateVariant);
router.delete("/admin/deletevariant/:id", checkadmin, checkRole("admin"), deleteVariant);


module.exports = router;
