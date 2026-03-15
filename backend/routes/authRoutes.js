const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp',    authController.sendOtp);
router.post('/verify-otp',  authController.verifyOtp);
router.post('/register',    authController.register);
router.post('/login',       authController.userLogin);
router.post('/admin-login', authController.adminLogin);
router.get('/me',           protect, authController.getMe);
router.post('/forgot-pin', authController.forgotPin);
router.post('/reset-pin',  authController.resetPin);

module.exports = router;