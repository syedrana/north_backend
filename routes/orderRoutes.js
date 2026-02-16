const express = require("express");
const router = express.Router();
const { confirmOrder, updateOrderStatus, getSingleOrder, downloadInvoice, getMyOrders } = require("../controllers/orderController");
const auth = require("../middleware/authMiddleware");

router.get("/my", auth, getMyOrders);
router.post("/confirm", auth, confirmOrder);
router.get("/myorder/invoice/:orderId", auth, downloadInvoice);
router.patch("/update/:id", auth, updateOrderStatus);
router.get("/:id", auth, getSingleOrder);


module.exports = router;
