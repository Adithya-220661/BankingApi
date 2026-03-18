const express = require('express');
const router = express.Router();
const { getTransactions, getTransactionById } = require('../controllers/Transactioncontroller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTransactions);
router.get('/:id', getTransactionById);

module.exports = router;