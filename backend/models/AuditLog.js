// const mongoose = require('mongoose');

// // ═══════════════════════════════════════════════════════════════
// //  AUDIT LOG MODEL
// //  Records every action performed by admin staff
// //  Used for insider threat detection & compliance
// // ═══════════════════════════════════════════════════════════════

// const auditLogSchema = new mongoose.Schema(
//   {
//     // ── Who did it ────────────────────────────────────────────
//     adminId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref:  'AdminUser',
//       required: true,
//     },
//     adminName: {
//       type: String,
//       required: true,
//     },
//     adminRole: {
//       type: String,
//       enum: ['superadmin', 'manager', 'cashier', 'clerk', 'loan_officer'],
//       required: true,
//     },

//     // ── What they did ─────────────────────────────────────────
//     action: {
//       type:     String,
//       required: true,
//       // Examples: VIEW_USER, LOCK_USER, UNLOCK_USER,
//       //           VIEW_TRANSACTIONS, DEPOSIT, WITHDRAWAL,
//       //           TRANSFER, EXPORT_CSV, LOGIN, LOGOUT,
//       //           CREATE_STAFF, DELETE_STAFF, BLOCKED_ATTEMPT
//     },

//     // ── Which customer was affected ───────────────────────────
//     targetUserId: {
//       type:    mongoose.Schema.Types.ObjectId,
//       ref:     'User',
//       default: null,
//     },
//     targetUserName: {
//       type:    String,
//       default: null,
//     },
//     targetAccountNumber: {
//       type:    String,
//       default: null,
//     },

//     // ── Result ────────────────────────────────────────────────
//     result: {
//       type:    String,
//       enum:    ['success', 'failed', 'blocked'],
//       default: 'success',
//     },

//     // ── Extra details ─────────────────────────────────────────
//     details: {
//       type:    String,   // human-readable description
//       default: '',
//     },
//     metadata: {
//       type:    mongoose.Schema.Types.Mixed,  // extra JSON data
//       default: {},
//     },

//     // ── Security flags ────────────────────────────────────────
//     isSuspicious: {
//       type:    Boolean,
//       default: false,
//     },
//     suspiciousReason: {
//       type:    String,
//       default: null,
//     },

//     // ── Network info ──────────────────────────────────────────
//     ipAddress: {
//       type:    String,
//       default: 'unknown',
//     },
//   },
//   { timestamps: true }
// );

// // ── Index for fast lookups ────────────────────────────────────
// auditLogSchema.index({ adminId: 1, createdAt: -1 });
// auditLogSchema.index({ targetUserId: 1, createdAt: -1 });
// auditLogSchema.index({ isSuspicious: 1 });
// auditLogSchema.index({ action: 1 });

// module.exports = mongoose.model('AuditLog', auditLogSchema);
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);