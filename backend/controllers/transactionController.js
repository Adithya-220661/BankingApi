const Transaction = require('../models/Transaction');

// GET /api/transactions?page=1&limit=10&type=deposit
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    const filter = { userId: req.user._id };
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 }) // Latest first
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('relatedUser', 'fullName accountNumber');

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      transactions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('relatedUser', 'fullName accountNumber');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.status(200).json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { getTransactions, getTransactionById };