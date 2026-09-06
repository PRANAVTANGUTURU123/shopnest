const express = require('express');
const { registerUser, loginUser, getUsers, verifyEmail, resendOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.get('/users', protect, admin, getUsers);

module.exports = router;
