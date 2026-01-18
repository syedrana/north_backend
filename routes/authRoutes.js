const express = require('express');
const router = express.Router();
const securapi = require('../middleware/secureApi');

const { adminRegistration } = require('../controllers/admin/adminRegController');
const login = require('../controllers/admin/adminLoginController');

router.post('/register', securapi, adminRegistration);
router.post('/login',  securapi, login)


module.exports = router;