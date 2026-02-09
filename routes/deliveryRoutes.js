const express = require("express");
const router = express.Router();

const {
  getDeliverySetting,
  createOrUpdate,
} = require("../controllers/admin/DeliveryController");

router.get("/", getDeliverySetting);
router.post("/",  createOrUpdate);

module.exports = router;
