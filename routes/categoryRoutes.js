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
  reorderCategories,
  trackCategoryUsage,
  getCategoryWithCounts,
} = require("../controllers/categoryController");

// =======================
// ADMIN ROUTES
// =======================

// Create
router.post("/create", upload.single("image"), createCategory);

// Update
router.put("/:id", upload.single("image"), updateCategory);

// Delete (soft delete)
router.delete("/:id", deleteCategory);

// Reorder (Drag & Drop)
router.put("/reorder", reorderCategories);

// Analytics (track usage)
router.post("/track/:id", trackCategoryUsage);


// =======================
// PUBLIC / COMMON ROUTES
// =======================

// Tree (⚠️ আগে দিতে হবে)
router.get("/tree", getCategoryTree);

// With product counts
router.get("/with-counts", getCategoryWithCounts);

// Get all (pagination + search)
router.get("/", getAllCategories);

// Get single (⚠️ সবশেষে রাখতে হবে)
router.get("/:id", getSingleCategory);


module.exports = router;