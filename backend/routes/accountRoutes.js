const express = require('express');
const router  = express.Router();
const { deposit, withdraw, transfer, getBalance } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All account routes require login

router.get('/balance',     getBalance);
router.post('/deposit',    deposit);
router.post('/withdraw',   withdraw);
router.post('/transfer',   transfer);

module.exports = router;