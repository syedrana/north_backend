const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");

const {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getSingleCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

// Admin (protect middleware পরে বসাবে)
router.post("/create", upload.single("image"), createCategory);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

// Public / Admin
router.get("/", getAllCategories);
router.get("/tree", getCategoryTree);
router.get("/:id", getSingleCategory);

module.exports = router;
