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
const upload = require("../middleware/upload");
const multerErrorHandler = require("../middleware/uploadErrorHandler");

const router = express.Router();

router.get("/", getHomepage);
router.get("/admin/sections", listHomepageSections);
router.get("/admin/sections/:sectionId", getHomepageSectionById);
router.post(
  "/admin/sections",
  multerErrorHandler(upload.any()),
  createHomepageSection
);
router.patch("/admin/sections/reorder", reorderHomepageSections);
router.patch(
  "/admin/sections/:sectionId",
  multerErrorHandler(upload.any()),
  updateHomepageSection
);
router.delete("/admin/sections/:sectionId", deleteHomepageSection);

module.exports = router;
