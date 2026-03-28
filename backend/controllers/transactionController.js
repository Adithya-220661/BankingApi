// const Transaction = require('../models/Transaction');

// // GET /api/transactions?page=1&limit=10&type=deposit
// const getTransactions = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, type } = req.query;

//     const filter = { userId: req.user._id };
//     if (type) filter.type = type;

//     const transactions = await Transaction.find(filter)
//       .sort({ createdAt: -1 }) // Latest first
//       .skip((page - 1) * Number(limit))
//       .limit(Number(limit))
//       .populate('relatedUser', 'fullName accountNumber');

//     const total = await Transaction.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       total,
//       page:  Number(page),
//       pages: Math.ceil(total / Number(limit)),
//       transactions,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error.', error: err.message });
//   }
// };

// // GET /api/transactions/:id
// const getTransactionById = async (req, res) => {
//   try {
//     const transaction = await Transaction.findOne({
//       _id: req.params.id,
//       userId: req.user._id,
//     }).populate('relatedUser', 'fullName accountNumber');

//     if (!transaction) {
//       return res.status(404).json({ success: false, message: 'Transaction not found.' });
//     }

//     res.status(200).json({ success: true, transaction });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Server error.', error: err.message });
//   }
// };

// module.exports = { getTransactions, getTransactionById };

const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;

    let filter = {};

    // RBAC
    if (
      ['manager', 'cashier', 'clerk', 'loanOfficer', 'super_admin']
      .includes(req.user.role)
    ) {
      filter = {};
    } else {
      filter = { userId: req.user._id };
    }

    if (type) filter.type = type;

    // 🔥 TRACK MANAGER ACTIVITY
    if (req.user.role === 'manager') {
      await AuditLog.create({
        action: 'MANAGER_VIEW_TRANSACTIONS',
        performedBy: req.user._id
      });

      // 🔥 DETECT SUSPICIOUS BEHAVIOR
      const recentActions = await AuditLog.countDocuments({
        performedBy: req.user._id,
        action: 'MANAGER_VIEW_TRANSACTIONS',
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (recentActions > 20) {
        await AuditLog.create({
          action: 'SUSPICIOUS_MANAGER_ACTIVITY',
          performedBy: req.user._id
        });
      }
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('relatedUser', 'fullName accountNumber');

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      transactions,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// GET /api/transactions/:id
const getTransactionById = async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    if (
      !['manager', 'cashier', 'clerk', 'loanOfficer', 'super_admin']
      .includes(req.user.role)
    ) {
      filter.userId = req.user._id;
    }

    const transaction = await Transaction.findOne(filter)
      .populate('relatedUser', 'fullName accountNumber');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({ success: true, transaction });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// CREATE TRANSACTION
const createTransaction = async (req, res) => {
  try {
    const { userId, amount, type, description } = req.body;

    const transaction = new Transaction({
      userId,
      amount,
      type,
      description,
      createdBy: req.user._id
    });

    // 🔥 CASHIER RESTRICTION
    if (req.user.role === 'cashier') {
      transaction.status = 'pending';
    } else {
      transaction.status = 'approved';
    }

    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Transaction created',
      transaction
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// ✅ ONLY SUPER ADMIN CAN APPROVE
const approveTransaction = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can approve transactions'
      });
    }

    const txn = await Transaction.findById(req.params.id);

    if (!txn) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    txn.status = 'approved';
    txn.approvedBy = req.user._id;

    await txn.save();

    res.status(200).json({
      success: true,
      message: 'Transaction approved'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  approveTransaction
};