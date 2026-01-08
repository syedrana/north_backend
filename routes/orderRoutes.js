const express = require("express");
const router = express.Router();
const { createCODOrder } = require("../controllers/orderController");
//const auth = require("../middlewares/authMiddleware");

router.post("/orders/cod", createCODOrder);

module.exports = router;
