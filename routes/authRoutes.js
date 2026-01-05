const express = require('express');
const router = express.Router();

const { adminRegistration } = require('../controllers/admin/adminRegController');

router.post('/register', adminRegistration);


module.exports = router;