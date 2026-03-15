const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.use(protectAdmin);

router.get('/stats',                  adminController.getStats);
router.get('/users',                  adminController.getAllUsers);
router.get('/users/:id',              adminController.getUserById);
router.patch('/users/:id/lock',       adminController.toggleLock);
router.get('/users/:id/transactions', adminController.getUserTransactions);

module.exports = router;