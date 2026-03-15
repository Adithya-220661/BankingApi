const User        = require('../models/User');
const Transaction = require('../models/Transaction');

// GET /api/admin/users — list all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const filter = { role: 'user' };
    if (search) {
      filter.$or = [
        { fullName:      { $regex: search, $options: 'i' } },
        { username:      { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } },
        { phone:         { $regex: search, $options: 'i' } },
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

// GET /api/admin/users/:id — single user details
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-pin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// PATCH /api/admin/users/:id/lock — lock or unlock an account
const toggleLock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot lock an admin account.' });
    }

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

// GET /api/admin/users/:id/transactions — view any user's transaction history
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

// GET /api/admin/stats — dashboard counts
const getStats = async (req, res) => {
  try {
    const totalUsers        = await User.countDocuments({ role: 'user' });
    const activeUsers       = await User.countDocuments({ role: 'user', isActive: true });
    const lockedUsers       = await User.countDocuments({ role: 'user', isActive: false });
    const totalTransactions = await Transaction.countDocuments();

    const balanceResult = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } },
    ]);
    const totalBalance = balanceResult[0]?.totalBalance || 0;

    res.status(200).json({
      success: true,
      stats: { totalUsers, activeUsers, lockedUsers, totalTransactions, totalBalance },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { getAllUsers, getUserById, toggleLock, getUserTransactions, getStats };