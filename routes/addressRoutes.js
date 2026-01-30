const express = require("express");
const router = express.Router();
const authGuard = require("../middleware/authMiddleware");

const {createAddress, getAddresses, setDefaultAddress, updateAddress} = require("../controllers/addressController");

router.post("/", authGuard, createAddress);
router.get("/", authGuard, getAddresses);
router.put("/:id", authGuard, updateAddress);
router.put("/:id/default", authGuard, setDefaultAddress);


module.exports = router;