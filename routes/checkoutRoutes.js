const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  getCheckout,
  createCheckoutFromCart,
  updateCheckout,
  updatePaymentMethod,
  buyNowCheckout,
} = require("../controllers/checkoutController");

router.get("/", auth, getCheckout);
router.post("/", auth, createCheckoutFromCart);
router.patch("/:id", auth, updateCheckout);
router.patch("/payment/:checkoutId", auth, updatePaymentMethod);
router.post("/buy-now", auth, buyNowCheckout);

module.exports = router;
