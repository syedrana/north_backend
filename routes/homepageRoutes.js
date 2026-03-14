const express = require("express");
const {
  getHomepage,
  listHomepageSections,
  getHomepageSectionById,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
  reorderHomepageSections,
} = require("../controllers/homepageController");

const router = express.Router();

router.get("/", getHomepage);
router.get("/admin/sections", listHomepageSections);
router.get("/admin/sections/:sectionId", getHomepageSectionById);
router.post("/admin/sections", createHomepageSection);
router.patch("/admin/sections/reorder",  reorderHomepageSections);
router.patch("/admin/sections/:sectionId", updateHomepageSection);
router.delete("/admin/sections/:sectionId", deleteHomepageSection);

module.exports = router;
