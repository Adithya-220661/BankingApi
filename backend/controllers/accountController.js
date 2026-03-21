const User        = require('../models/User');
const Transaction = require('../models/Transaction');

// POST /api/account/deposit
const deposit = async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const user = await User.findById(req.user._id);
    const balanceBefore = user.balance;
    const balanceAfter  = balanceBefore + Number(amount);

    user.balance = balanceAfter;
    await user.save();

    const transaction = await Transaction.create({
      userId: user._id,
      type: 'deposit',
      amount: Number(amount),
      balanceBefore,
      balanceAfter,
      description: description || 'Cash deposit',
    });

    res.status(200).json({
      success: true,
      message: `₹${amount} deposited successfully.`,
      newBalance: balanceAfter,
      transaction,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// POST /api/account/withdraw
const withdraw = async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const user = await User.findById(req.user._id);

    if (user.balance < Number(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    const balanceBefore = user.balance;
    const balanceAfter  = balanceBefore - Number(amount);

    user.balance = balanceAfter;
    await user.save();

    const transaction = await Transaction.create({
      userId: user._id,
      type: 'withdrawal',
      amount: Number(amount),
      balanceBefore,
      balanceAfter,
      description: description || 'Cash withdrawal',
    });

    res.status(200).json({
      success: true,
      message: `₹${amount} withdrawn successfully.`,
      newBalance: balanceAfter,
      transaction,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// POST /api/account/transfer
const transfer = async (req, res) => {
  try {
    const { toAccountNumber, amount, description } = req.body;

    if (!toAccountNumber || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Recipient account number and a valid amount are required.' });
    }

    if (req.user.accountNumber === toAccountNumber) {
      return res.status(400).json({ success: false, message: 'Cannot transfer to your own account.' });
    }

    const sender   = await User.findById(req.user._id);
    const receiver = await User.findOne({ accountNumber: toAccountNumber });

    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Recipient account not found.' });
    }
    if (!receiver.isActive) {
      return res.status(400).json({ success: false, message: 'Recipient account is locked.' });
    }

    if (sender.balance < Number(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    const senderBefore   = sender.balance;
    const receiverBefore = receiver.balance;

    sender.balance   = senderBefore   - Number(amount);
    receiver.balance = receiverBefore + Number(amount);

    await sender.save();
    await receiver.save();

    // Record both sides
    await Transaction.create({
      userId: sender._id,
      type: 'transfer_sent',
      amount: Number(amount),
      balanceBefore: senderBefore,
      balanceAfter: sender.balance,
      description: description || `Transfer to ${toAccountNumber}`,
      relatedUser: receiver._id,
      relatedAccountNumber: toAccountNumber,
    });

    await Transaction.create({
      userId: receiver._id,
      type: 'transfer_received',
      amount: Number(amount),
      balanceBefore: receiverBefore,
      balanceAfter: receiver.balance,
      description: description || `Transfer from ${sender.accountNumber}`,
      relatedUser: sender._id,
      relatedAccountNumber: sender.accountNumber,
    });

    res.status(200).json({
      success: true,
      message: `₹${amount} transferred to ${receiver.fullName} successfully.`,
      newBalance: sender.balance,
      recipient: {
        name:          receiver.fullName,
        accountNumber: receiver.accountNumber,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/account/balance
const getBalance = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      accountNumber: req.user.accountNumber,
      balance:       req.user.balance,
      fullName:      req.user.fullName,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { deposit, withdraw, transfer, getBalance };