const User        = require('../models/User');
const Transaction = require('../models/Transaction');

// ── GET /api/admin/stats ──────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const totalUsers   = await User.countDocuments({ role: 'user' });
    const activeUsers  = await User.countDocuments({ role: 'user', isActive: true });
    const lockedUsers  = await User.countDocuments({ role: 'user', isActive: false });
    const totalTx      = await Transaction.countDocuments();

    const balResult = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);
    const totalBalance = balResult[0]?.total || 0;

    const depResult = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalDeposits = depResult[0]?.total || 0;

    const witResult = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalWithdrawals = witResult[0]?.total || 0;

    const trnResult = await Transaction.aggregate([
      { $match: { type: 'transfer_sent', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalTransfers = trnResult[0]?.total || 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTx = await Transaction.countDocuments({
      createdAt: { $gte: todayStart },
    });

    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const dayLabel = start.toLocaleDateString('en-IN', { weekday: 'short' });

      const [dep, wit, trn] = await Promise.all([
        Transaction.aggregate([
          { $match: { type: 'deposit', status: 'success', createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { type: 'withdrawal', status: 'success', createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { type: 'transfer_sent', status: 'success', createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      trends.push({
        day:         dayLabel,
        deposits:    dep[0]?.total || 0,
        withdrawals: wit[0]?.total || 0,
        transfers:   trn[0]?.total || 0,
      });
    }

    const monthlyReg = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = start.toLocaleDateString('en-IN', { month: 'short' });
      const count = await User.countDocuments({
        role: 'user',
        createdAt: { $gte: start, $lte: end },
      });
      monthlyReg.push({ month: label, count });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        lockedUsers,
        totalBalance,
        totalDeposits,
        totalWithdrawals,
        totalTransfers,
        totalTransactions: totalTx,
        todayTransactions: todayTx,
        trends,
        monthlyReg,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ── GET /api/admin/users ──────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const filter = { role: 'user' };

    if (search) {
      filter.$or = [
        { fullName:      { $regex: search, $options: 'i' } },
        { username:      { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } },
        { phone:         { $regex: search, $options: 'i' } },
        { email:         { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .select('-pin');

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      users,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ── GET /api/admin/users/:id ──────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-pin');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ── PATCH /api/admin/users/:id/lock ──────────────────────────
const toggleLock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot lock admin.' });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Account ${user.isActive ? 'unlocked' : 'locked'} successfully.`,
      isActive: user.isActive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ── GET /api/admin/users/:id/transactions ─────────────────────
const getUserTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const transactions = await Transaction.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('relatedUser', 'fullName accountNumber');

    const total = await Transaction.countDocuments({ userId: req.params.id });

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

// ── GET /api/admin/transactions ───────────────────────────────
const getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('userId', 'fullName accountNumber')
      .populate('relatedUser', 'fullName accountNumber');

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({ success: true, total, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getUserById,
  toggleLock,
  getUserTransactions,
  getAllTransactions,
};