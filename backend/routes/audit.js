const express    = require('express');
const router     = express.Router();
const AuditLog   = require('../models/AuditLog');
const { protectAdmin } = require('../middleware/authMiddleware');
const allowRoles       = require('../middleware/roleMiddleware');

// ══════════════════════════════════════════════════════════════
//  GET AUDIT LOGS
//  GET /api/audit
//  Roles: superadmin only
// ══════════════════════════════════════════════════════════════
router.get('/',
  protectAdmin,
  allowRoles('superadmin'),
  async (req, res) => {
    try {
      const { role, action, suspicious, limit = 100 } = req.query;

      // ── Build filter ────────────────────────────────────────
      const filter = {};
      if (action) filter.action = action;

      const logs = await AuditLog.find(filter)
        .populate('performedBy', 'fullName role adminId')
        .populate('targetUser',  'fullName accountNumber email')
        .sort({ timestamp: -1 })
        .limit(Number(limit));

      res.status(200).json({
        success: true,
        count:   logs.length,
        logs,
      });

    } catch (err) {
      console.log('AUDIT LOGS ERROR:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error.',
        error: err.message
      });
    }
  }
);

module.exports = router;