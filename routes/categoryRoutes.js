const express = require("express");
const router = express.Router();

const {
  createCategory,
  getAllCategories,
  getCategoryTree,
  getSingleCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

// Admin (protect middleware পরে বসাবে)
router.post("/create", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

// Public / Admin
router.get("/", getAllCategories);
router.get("/tree", getCategoryTree);
router.get("/:id", getSingleCategory);

module.exports = router;
