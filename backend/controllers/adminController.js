const User        = require('../models/User');
const Transaction = require('../models/Transaction');
const AdminUser   = require('../models/AdminUser');
const AuditLog    = require('../models/AuditLog');

// ════════════════════════════════════════════════════════════
//  GET ALL USERS
//  GET /api/admin/users
//  Roles: superadmin, manager, clerk
// ════════════════════════════════════════════════════════════
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-pin -loginAttempts -lockUntil')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (err) {
    console.log('GET ALL USERS ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET SINGLE USER
//  GET /api/admin/users/:id
//  Roles: superadmin, manager, clerk
// ════════════════════════════════════════════════════════════
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-pin -loginAttempts -lockUntil');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (err) {
    console.log('GET USER BY ID ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  TOGGLE LOCK / UNLOCK USER
//  PATCH /api/admin/users/:id/lock
//  Roles: superadmin only
// ════════════════════════════════════════════════════════════
const toggleUserLock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // ── Toggle active status ──────────────────────────────────
    user.isActive = !user.isActive;
    await user.save();

    // ── Save audit log ────────────────────────────────────────
    await AuditLog.create({
      action:      user.isActive ? 'UNLOCK_USER' : 'LOCK_USER',
      performedBy: req.admin?._id || req.user?._id,
      targetUser:  user._id,
    });

    const action = user.isActive ? 'unlocked' : 'locked';
    console.log(`✅ User ${user.fullName} ${action} by ${req.admin?.fullName}`);

    res.status(200).json({
      success:  true,
      message:  `User account ${action} successfully.`,
      isActive: user.isActive,
    });

  } catch (err) {
    console.log('TOGGLE LOCK ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET ALL TRANSACTIONS
//  GET /api/admin/transactions
//  Roles: superadmin, manager, cashier
// ════════════════════════════════════════════════════════════
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'fullName accountNumber email')
      .sort({ createdAt: -1 })
      .limit(500);

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });

  } catch (err) {
    console.log('GET ALL TRANSACTIONS ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET USER TRANSACTIONS
//  GET /api/admin/users/:id/transactions
//  Roles: superadmin, manager, cashier, clerk
// ════════════════════════════════════════════════════════════
const getUserTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const transactions = await Transaction.find({ user: req.params.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });

  } catch (err) {
    console.log('GET USER TRANSACTIONS ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  APPROVE TRANSACTION
//  PATCH /api/admin/transactions/:id/approve
//  Roles: superadmin only
// ════════════════════════════════════════════════════════════
const approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    if (transaction.status === 'success') {
      return res.status(400).json({
        success: false,
        message: 'Transaction is already approved.'
      });
    }

    transaction.status = 'success';
    await transaction.save();

    // ── Save audit log ────────────────────────────────────────
    await AuditLog.create({
      action:      'APPROVE_TRANSACTION',
      performedBy: req.admin?._id || req.user?._id,
      targetUser:  transaction.userId,
      amount:      transaction.amount,
    });

    res.status(200).json({
      success: true,
      message: 'Transaction approved successfully.',
      transaction,
    });

  } catch (err) {
    console.log('APPROVE TRANSACTION ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  CREATE ADMIN STAFF
//  POST /api/admin/create-admin
//  Roles: superadmin only
// ════════════════════════════════════════════════════════════
const createAdmin = async (req, res) => {
  try {
    const { fullName, adminId, email, phone, password, role, branchCode } = req.body;

    if (!fullName || !adminId || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'fullName, adminId, email, password and role are required.'
      });
    }

    const validRoles = ['manager', 'cashier', 'clerk', 'loan_officer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const existingId    = await AdminUser.findOne({ adminId });
    const existingEmail = await AdminUser.findOne({ email });

    if (existingId) {
      return res.status(409).json({ success: false, message: 'Admin ID already exists.' });
    }
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const newStaff = await AdminUser.create({
      fullName,
      adminId,
      email,
      phone:      phone || '',
      password,
      role,
      branchCode: branchCode || 'HQ',
      createdBy:  req.admin?._id || null,
    });

    // ── Save audit log ────────────────────────────────────────
    await AuditLog.create({
      action:      'CREATE_STAFF',
      performedBy: req.admin?._id || req.user?._id,
      targetUser:  newStaff._id,
    });

    console.log(`✅ New staff: ${newStaff.fullName} (${newStaff.role}) by ${req.admin?.fullName}`);

    res.status(201).json({
      success: true,
      message: `Staff member ${newStaff.fullName} created successfully as ${role}.`,
      staff: {
        id:         newStaff._id,
        fullName:   newStaff.fullName,
        adminId:    newStaff.adminId,
        email:      newStaff.email,
        role:       newStaff.role,
        branchCode: newStaff.branchCode,
      },
    });

  } catch (err) {
    console.log('CREATE ADMIN ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET DASHBOARD STATS
//  GET /api/admin/stats
//  Roles: superadmin, manager, loan_officer
// ════════════════════════════════════════════════════════════
const getStats = async (req, res) => {
  try {
    const users        = await User.find({ role: 'user' });
    const transactions = await Transaction.find();

    const totalUsers   = users.length;
    const activeUsers  = users.filter(u =>  u.isActive).length;
    const lockedUsers  = users.filter(u => !u.isActive).length;
    const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);

    const totalDeposits     = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const totalWithdrawals  = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
    const totalTransfers    = transactions.filter(t => t.type === 'transfer_sent').reduce((s, t) => s + t.amount, 0);
    const totalTransactions = transactions.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = transactions.filter(t => new Date(t.createdAt) >= today).length;

    // ── Last 7 days trends ────────────────────────────────────
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const dayTx = transactions.filter(t => {
        const d = new Date(t.createdAt);
        return d >= date && d < next;
      });

      trends.push({
        day:         date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }),
        deposits:    dayTx.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0),
        withdrawals: dayTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0),
        transfers:   dayTx.filter(t => t.type === 'transfer_sent').reduce((s, t) => s + t.amount, 0),
      });
    }

    // ── Monthly registrations (last 6 months) ─────────────────
    const monthlyReg = [];
    for (let i = 5; i >= 0; i--) {
      const date  = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const count = users.filter(u => {
        const d = new Date(u.createdAt);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      }).length;
      monthlyReg.push({ month, count });
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
        totalTransactions,
        todayTransactions,
        trends,
        monthlyReg,
      },
    });

  } catch (err) {
    console.log('GET STATS ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET AUDIT LOGS
//  GET /api/admin/audit-logs
//  Roles: superadmin only
// ════════════════════════════════════════════════════════════
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'fullName role username')
      .populate('targetUser',  'fullName accountNumber email')
      .sort({ timestamp: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });

  } catch (err) {
    console.log('GET AUDIT LOGS ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  toggleUserLock,
  getAllTransactions,
  getUserTransactions,
  approveTransaction,
  createAdmin,
  getStats,
  getAuditLogs,
};