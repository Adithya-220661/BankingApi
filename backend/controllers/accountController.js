// const User        = require('../models/User');
// const Transaction = require('../models/Transaction');

// // POST /api/account/deposit
// const deposit = async (req, res) => {
//   try {
//     const { amount, description } = req.body;

//     if (!amount || Number(amount) <= 0) {
//       return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
//     }

//     const user = await User.findById(req.user._id);
//     const balanceBefore = user.balance;
//     const balanceAfter  = balanceBefore + Number(amount);

//     user.balance = balanceAfter;
//     await user.save();

//     const transaction = await Transaction.create({
//       userId: user._id,
//       type: 'deposit',
//       amount: Number(amount),
//       balanceBefore,
//       balanceAfter,
//       description: description || 'Cash deposit',
//     });

//     res.status(200).json({
//       success: true,
//       message: `₹${amount} deposited successfully.`,
//       newBalance: balanceAfter,
//       transaction,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error.', error: err.message });
//   }
// };

// // POST /api/account/withdraw
// const withdraw = async (req, res) => {
//   try {
//     const { amount, description } = req.body;

//     if (!amount || Number(amount) <= 0) {
//       return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
//     }

//     const user = await User.findById(req.user._id);

//     if (user.balance < Number(amount)) {
//       return res.status(400).json({ success: false, message: 'Insufficient balance.' });
//     }

//     const balanceBefore = user.balance;
//     const balanceAfter  = balanceBefore - Number(amount);

//     user.balance = balanceAfter;
//     await user.save();

//     const transaction = await Transaction.create({
//       userId: user._id,
//       type: 'withdrawal',
//       amount: Number(amount),
//       balanceBefore,
//       balanceAfter,
//       description: description || 'Cash withdrawal',
//     });

//     res.status(200).json({
//       success: true,
//       message: `₹${amount} withdrawn successfully.`,
//       newBalance: balanceAfter,
//       transaction,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error.', error: err.message });
//   }
// };

// // POST /api/account/transfer
// const transfer = async (req, res) => {
//   try {
//     const { toAccountNumber, amount, description } = req.body;

//     if (!toAccountNumber || !amount || Number(amount) <= 0) {
//       return res.status(400).json({ success: false, message: 'Recipient account number and a valid amount are required.' });
//     }

//     if (req.user.accountNumber === toAccountNumber) {
//       return res.status(400).json({ success: false, message: 'Cannot transfer to your own account.' });
//     }

//     const sender   = await User.findById(req.user._id);
//     const receiver = await User.findOne({ accountNumber: toAccountNumber });

//     if (!receiver) {
//       return res.status(404).json({ success: false, message: 'Recipient account not found.' });
//     }
//     if (!receiver.isActive) {
//       return res.status(400).json({ success: false, message: 'Recipient account is locked.' });
//     }

//     if (sender.balance < Number(amount)) {
//       return res.status(400).json({ success: false, message: 'Insufficient balance.' });
//     }

//     const senderBefore   = sender.balance;
//     const receiverBefore = receiver.balance;

//     sender.balance   = senderBefore   - Number(amount);
//     receiver.balance = receiverBefore + Number(amount);

//     await sender.save();
//     await receiver.save();

//     // Record both sides
//     await Transaction.create({
//       userId: sender._id,
//       type: 'transfer_sent',
//       amount: Number(amount),
//       balanceBefore: senderBefore,
//       balanceAfter: sender.balance,
//       description: description || `Transfer to ${toAccountNumber}`,
//       relatedUser: receiver._id,
//       relatedAccountNumber: toAccountNumber,
//     });

//     await Transaction.create({
//       userId: receiver._id,
//       type: 'transfer_received',
//       amount: Number(amount),
//       balanceBefore: receiverBefore,
//       balanceAfter: receiver.balance,
//       description: description || `Transfer from ${sender.accountNumber}`,
//       relatedUser: sender._id,
//       relatedAccountNumber: sender.accountNumber,
//     });

//     res.status(200).json({
//       success: true,
//       message: `₹${amount} transferred to ${receiver.fullName} successfully.`,
//       newBalance: sender.balance,
//       recipient: {
//         name:          receiver.fullName,
//         accountNumber: receiver.accountNumber,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error.', error: err.message });
//   }
// };

// // GET /api/account/balance
// const getBalance = async (req, res) => {
//   try {
//     res.status(200).json({
//       success: true,
//       accountNumber: req.user.accountNumber,
//       balance:       req.user.balance,
//       fullName:      req.user.fullName,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error.', error: err.message });
//   }
// };

// module.exports = { deposit, withdraw, transfer, getBalance };

const User        = require('../models/User');
const Transaction = require('../models/Transaction');

// ════════════════════════════════════════════════════════════
//  GET BALANCE
//  GET /api/account/balance
//  Protected — requires login token
// ════════════════════════════════════════════════════════════
const getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      balance:       user.balance,
      accountNumber: user.accountNumber,
      fullName:      user.fullName,
    });

  } catch (err) {
    console.log('GET BALANCE ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  DEPOSIT
//  POST /api/account/deposit
//  Body: { amount, description }
//  Protected — requires login token
// ════════════════════════════════════════════════════════════
const deposit = async (req, res) => {
  try {
    const { amount, description } = req.body;

    // ── Validate amount ───────────────────────────────────────
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required.'
      });
    }

    const depositAmount = Number(amount);

    if (depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Deposit amount must be greater than zero.'
      });
    }

    if (depositAmount > 1000000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum deposit limit is ₹10,00,000 per transaction.'
      });
    }

    // ── Find user ─────────────────────────────────────────────
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is locked. Please contact Horizon Bank support.'
      });
    }

    // ── Update balance ────────────────────────────────────────
    const balanceBefore = user.balance;
    const balanceAfter  = balanceBefore + depositAmount;

    await User.findByIdAndUpdate(req.user._id, { balance: balanceAfter });

    // ── Save transaction record ───────────────────────────────
    const transaction = await Transaction.create({
      userId:        user._id,
      type:          'deposit',
      amount:        depositAmount,
      balanceBefore,
      balanceAfter,
      description:   description || 'Cash Deposit',
      status:        'success',
    });

    console.log(`✅ Deposit: ₹${depositAmount} → ${user.fullName} | Balance: ₹${balanceAfter}`);

    res.status(200).json({
      success: true,
      message: `₹${depositAmount.toLocaleString('en-IN')} deposited successfully!`,
      transaction: {
        id:            transaction._id,
        type:          'deposit',
        amount:        depositAmount,
        balanceBefore,
        balanceAfter,
        description:   transaction.description,
        date:          transaction.createdAt,
      },
      newBalance: balanceAfter,
    });

  } catch (err) {
    console.log('DEPOSIT ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  WITHDRAW
//  POST /api/account/withdraw
//  Body: { amount, description }
//  Protected — requires login token
// ════════════════════════════════════════════════════════════
const withdraw = async (req, res) => {
  try {
    const { amount, description } = req.body;

    // ── Validate amount ───────────────────────────────────────
    if (!amount || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required.'
      });
    }

    const withdrawAmount = Number(amount);

    if (withdrawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal amount must be greater than zero.'
      });
    }

    if (withdrawAmount > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum withdrawal limit is ₹1,00,000 per transaction.'
      });
    }

    // ── Find user ─────────────────────────────────────────────
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is locked. Please contact Horizon Bank support.'
      });
    }

    // ── Check sufficient balance ──────────────────────────────
    if (user.balance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your current balance is ₹${user.balance.toLocaleString('en-IN')}.`
      });
    }

    // ── Minimum balance check (₹500 must remain) ─────────────
    const MIN_BALANCE = 500;
    if (user.balance - withdrawAmount < MIN_BALANCE) {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw. Minimum balance of ₹${MIN_BALANCE} must be maintained.`
      });
    }

    // ── Update balance ────────────────────────────────────────
    const balanceBefore = user.balance;
    const balanceAfter  = balanceBefore - withdrawAmount;

    await User.findByIdAndUpdate(req.user._id, { balance: balanceAfter });

    // ── Save transaction record ───────────────────────────────
    const transaction = await Transaction.create({
      userId:        user._id,
      type:          'withdrawal',
      amount:        withdrawAmount,
      balanceBefore,
      balanceAfter,
      description:   description || 'Cash Withdrawal',
      status:        'success',
    });

    console.log(`✅ Withdrawal: ₹${withdrawAmount} ← ${user.fullName} | Balance: ₹${balanceAfter}`);

    res.status(200).json({
      success: true,
      message: `₹${withdrawAmount.toLocaleString('en-IN')} withdrawn successfully!`,
      transaction: {
        id:            transaction._id,
        type:          'withdrawal',
        amount:        withdrawAmount,
        balanceBefore,
        balanceAfter,
        description:   transaction.description,
        date:          transaction.createdAt,
      },
      newBalance: balanceAfter,
    });

  } catch (err) {
    console.log('WITHDRAW ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  TRANSFER
//  POST /api/account/transfer
//  Body: { toAccountNumber, amount, description }
//  Protected — requires login token
// ════════════════════════════════════════════════════════════
const transfer = async (req, res) => {
  try {
    const { toAccountNumber, amount, description } = req.body;

    // ── Validate inputs ───────────────────────────────────────
    if (!toAccountNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Recipient account number and amount are required.'
      });
    }

    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required.'
      });
    }

    const transferAmount = Number(amount);

    if (transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount must be greater than zero.'
      });
    }

    if (transferAmount > 200000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum transfer limit is ₹2,00,000 per transaction.'
      });
    }

    // ── Find sender ───────────────────────────────────────────
    const sender = await User.findById(req.user._id);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender account not found.'
      });
    }

    if (!sender.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is locked. Please contact Horizon Bank support.'
      });
    }

    // ── Cannot transfer to own account ────────────────────────
    if (sender.accountNumber === toAccountNumber) {
      return res.status(400).json({
        success: false,
        message: 'You cannot transfer money to your own account.'
      });
    }

    // ── Find receiver ─────────────────────────────────────────
    const receiver = await User.findOne({ accountNumber: toAccountNumber });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: `No account found with number ${toAccountNumber}. Please check and try again.`
      });
    }

    if (!receiver.isActive) {
      return res.status(403).json({
        success: false,
        message: 'The recipient account is currently locked.'
      });
    }

    // ── Check sufficient balance ──────────────────────────────
    if (sender.balance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your current balance is ₹${sender.balance.toLocaleString('en-IN')}.`
      });
    }

    // ── Minimum balance check ─────────────────────────────────
    const MIN_BALANCE = 500;
    if (sender.balance - transferAmount < MIN_BALANCE) {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer. Minimum balance of ₹${MIN_BALANCE} must be maintained.`
      });
    }

    // ── Calculate new balances ────────────────────────────────
    const senderBalanceBefore   = sender.balance;
    const senderBalanceAfter    = senderBalanceBefore - transferAmount;
    const receiverBalanceBefore = receiver.balance;
    const receiverBalanceAfter  = receiverBalanceBefore + transferAmount;

    // ── Update both accounts ──────────────────────────────────
    await User.findByIdAndUpdate(sender._id,   { balance: senderBalanceAfter });
    await User.findByIdAndUpdate(receiver._id, { balance: receiverBalanceAfter });

    const txDescription = description || `Transfer to ${receiver.fullName}`;

    // ── Save SENDER transaction (transfer_sent) ───────────────
    const senderTx = await Transaction.create({
      userId:        sender._id,
      type:          'transfer_sent',
      amount:        transferAmount,
      balanceBefore: senderBalanceBefore,
      balanceAfter:  senderBalanceAfter,
      description:   txDescription,
      status:        'success',
    });

    // ── Save RECEIVER transaction (transfer_received) ─────────
    await Transaction.create({
      userId:        receiver._id,
      type:          'transfer_received',
      amount:        transferAmount,
      balanceBefore: receiverBalanceBefore,
      balanceAfter:  receiverBalanceAfter,
      description:   `Transfer from ${sender.fullName}`,
      status:        'success',
    });

    console.log(`✅ Transfer: ₹${transferAmount} | ${sender.fullName} → ${receiver.fullName}`);

    res.status(200).json({
      success: true,
      message: `₹${transferAmount.toLocaleString('en-IN')} transferred successfully to ${receiver.fullName}!`,
      transaction: {
        id:            senderTx._id,
        type:          'transfer_sent',
        amount:        transferAmount,
        to:            receiver.fullName,
        toAccount:     receiver.accountNumber,
        balanceBefore: senderBalanceBefore,
        balanceAfter:  senderBalanceAfter,
        description:   txDescription,
        date:          senderTx.createdAt,
      },
      newBalance: senderBalanceAfter,
    });

  } catch (err) {
    console.log('TRANSFER ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

module.exports = { getBalance, deposit, withdraw, transfer };