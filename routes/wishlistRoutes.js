const express = require("express");
const router = express.Router();

const {
  getWishlist,
  toggleWishlist,
  getWishlistCount,
  addToWishlist,
  removeFromWishlist,
} = require("../controllers/wishlistController");

const auth = require("../middleware/optionalAuth");

router.get("/", auth, getWishlist);

router.post("/toggle", auth, toggleWishlist);

router.get("/count", auth, getWishlistCount);

router.post("/add", auth, addToWishlist);

router.delete("/:productId", auth, removeFromWishlist);

module.exports = router;