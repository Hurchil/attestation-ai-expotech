const express = require('express');
const { login, verifyToken } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/verify', authMiddleware, verifyToken);

module.exports = router;