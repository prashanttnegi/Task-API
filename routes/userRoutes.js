// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

router.get('/me', auth, userController.getMyProfile);
router.get('/', auth, roles('admin'), userController.getAllUsers); // Admin-only

module.exports = router;