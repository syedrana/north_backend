const express = require("express");
const router = express.Router();
const authGuard = require("../middleware/authMiddleware");

const {
    getCart, 
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} = require("../controllers/cartController");

router.get("/", authGuard, getCart);
router.post("/add", authGuard, addToCart);
router.put("/update", authGuard, updateCartItem);    // UPDATE qty
router.delete("/:variantId", authGuard, removeCartItem); // REMOVE item
router.delete("/", authGuard, clearCart);

module.exports = router;
