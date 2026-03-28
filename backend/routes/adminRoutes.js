const express    = require('express');
const router     = express.Router();

const { protectAdmin } = require('../middleware/authMiddleware');
const allowRoles       = require('../middleware/roleMiddleware');

const {
  getAllUsers,
  getUserById,
  toggleUserLock,
  getAllTransactions,
  getUserTransactions,
  approveTransaction,
  createAdmin,
  getStats,
  getAuditLogs,
} = require('../controllers/adminController');

// ══════════════════════════════════════════════════════════════
//  STATS — superadmin, manager, loan_officer
// ══════════════════════════════════════════════════════════════
router.get('/stats',
  protectAdmin,
  allowRoles('superadmin', 'manager', 'loan_officer'),
  getStats
);

// ══════════════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════════════
router.get('/users',
  protectAdmin,
  allowRoles('superadmin', 'manager', 'clerk'),
  getAllUsers
);

router.get('/users/:id',
  protectAdmin,
  allowRoles('superadmin', 'manager', 'clerk'),
  getUserById
);

router.patch('/users/:id/lock',
  protectAdmin,
  allowRoles('superadmin'),
  toggleUserLock
);

router.get('/users/:id/transactions',
  protectAdmin,
  allowRoles('superadmin', 'manager', 'cashier', 'clerk'),
  getUserTransactions
);

// ══════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ══════════════════════════════════════════════════════════════
router.get('/transactions',
  protectAdmin,
  allowRoles('superadmin', 'manager', 'cashier'),
  getAllTransactions
);

router.patch('/transactions/:id/approve',
  protectAdmin,
  allowRoles('superadmin'),
  approveTransaction
);

// ══════════════════════════════════════════════════════════════
//  CREATE ADMIN STAFF — superadmin only
// ══════════════════════════════════════════════════════════════
router.post('/create-admin',
  protectAdmin,
  allowRoles('superadmin'),
  createAdmin
);

// ══════════════════════════════════════════════════════════════
//  AUDIT LOGS — superadmin only
// ══════════════════════════════════════════════════════════════
router.get('/audit-logs',
  protectAdmin,
  allowRoles('superadmin'),
  getAuditLogs
);

module.exports = router;