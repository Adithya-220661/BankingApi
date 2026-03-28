const AuditLog = require('../models/AuditLog');

// ═══════════════════════════════════════════════════════════════
//  GET ALL AUDIT LOGS (Super Admin only)
//  GET /api/audit
// ═══════════════════════════════════════════════════════════════
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, action, suspicious } = req.query;
    const filter = {};

    if (role)       filter.adminRole      = role;
    if (action)     filter.action         = action;
    if (suspicious === 'true') filter.isSuspicious = true;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('adminId',       'fullName adminId role')
      .populate('targetUserId',  'fullName accountNumber');

    const total = await AuditLog.countDocuments(filter);
    const suspiciousCount = await AuditLog.countDocuments({ isSuspicious: true });

    res.status(200).json({
      success: true,
      total,
      suspiciousCount,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET SUSPICIOUS LOGS ONLY
//  GET /api/audit/suspicious
// ═══════════════════════════════════════════════════════════════
const getSuspiciousLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const logs = await AuditLog.find({ isSuspicious: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('adminId',      'fullName adminId role')
      .populate('targetUserId', 'fullName accountNumber');

    const total = await AuditLog.countDocuments({ isSuspicious: true });

    res.status(200).json({ success: true, total, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET LOGS BY SPECIFIC STAFF MEMBER
//  GET /api/audit/staff/:adminId
// ═══════════════════════════════════════════════════════════════
const getStaffAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const logs = await AuditLog.find({ adminId: req.params.adminId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))
      .populate('targetUserId', 'fullName accountNumber');

    const total = await AuditLog.countDocuments({ adminId: req.params.adminId });

    res.status(200).json({ success: true, total, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { getAuditLogs, getSuspiciousLogs, getStaffAuditLogs };
