const AuditLog = require('../models/AuditLog');

// ═══════════════════════════════════════════════════════════════
//  AUDIT MIDDLEWARE
//  Automatically logs every admin staff action to AuditLog
//  Used for insider threat detection and compliance
// ═══════════════════════════════════════════════════════════════

// ── Map route → action label ──────────────────────────────────
const getActionLabel = (method, url) => {
  if (url.includes('/stats'))              return 'VIEW_STATS';
  if (url.includes('/audit'))              return 'VIEW_AUDIT_LOGS';
  if (url.includes('/staff'))             return method === 'GET' ? 'VIEW_STAFF' :
                                                  method === 'POST' ? 'CREATE_STAFF' :
                                                  method === 'DELETE' ? 'DELETE_STAFF' : 'EDIT_STAFF';
  if (url.includes('/lock'))              return 'LOCK_UNLOCK_USER';
  if (url.includes('/transactions') && url.includes('/users')) return 'VIEW_USER_TRANSACTIONS';
  if (url.includes('/transactions'))      return 'VIEW_ALL_TRANSACTIONS';
  if (url.includes('/users') && method === 'GET' && url.match(/users\/[a-f0-9]{24}$/)) return 'VIEW_USER_DETAIL';
  if (url.includes('/users'))             return 'VIEW_USERS';
  if (url.includes('/deposit'))           return 'DEPOSIT';
  if (url.includes('/withdrawal'))        return 'WITHDRAWAL';
  if (url.includes('/transfer'))          return 'TRANSFER';
  if (url.includes('/export'))            return 'EXPORT_CSV';
  if (url.includes('/loan'))              return 'LOAN_MANAGEMENT';
  return `${method}_${url.split('/').pop().toUpperCase()}`;
};

// ── Core audit logger ─────────────────────────────────────────
const auditLog = (action = null) => {
  return async (req, res, next) => {
    // Store original res.json so we can intercept it
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      // ── Only log if admin is authenticated ─────────────────
      if (req.admin) {
        try {
          const finalAction = action || getActionLabel(req.method, req.originalUrl);
          const result      = data?.success === false ? 'failed' : 'success';

          // Extract target user info from request params or body
          const targetUserId      = req.params.id || req.params.userId || req.body?.targetUserId || null;
          const targetUserName    = data?.user?.fullName || req.body?.targetUserName || null;
          const targetAccNumber   = data?.user?.accountNumber || null;

          await AuditLog.create({
            adminId:             req.admin._id,
            adminName:           req.admin.adminName || req.admin.fullName,
            adminRole:           req.admin.role,
            action:              finalAction,
            targetUserId:        targetUserId || null,
            targetUserName:      targetUserName || null,
            targetAccountNumber: targetAccNumber || null,
            result,
            details:             `${req.method} ${req.originalUrl}`,
            metadata: {
              body:       req.body || {},
              statusCode: res.statusCode,
            },
            isSuspicious:     req.isSuspicious     || false,
            suspiciousReason: req.suspiciousReason || null,
            ipAddress:        req.ip || req.headers['x-forwarded-for'] || 'unknown',
          });

          // ── Alert if suspicious ───────────────────────────
          if (req.isSuspicious) {
            console.warn(
              `🚨 SUSPICIOUS ACTIVITY ALERT:\n` +
              `   Staff: ${req.admin.adminName} [${req.admin.role}]\n` +
              `   Action: ${finalAction}\n` +
              `   Reason: ${req.suspiciousReason}\n` +
              `   Time: ${new Date().toISOString()}`
            );
          }
        } catch (logErr) {
          // Never block the response even if logging fails
          console.error('Audit log error:', logErr.message);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

// ── Log blocked attempts (from roleMiddleware) ────────────────
const auditBlockedAttempt = async (req, action, reason) => {
  if (!req.admin) return;
  try {
    await AuditLog.create({
      adminId:          req.admin._id,
      adminName:        req.admin.adminName || req.admin.fullName,
      adminRole:        req.admin.role,
      action:           'BLOCKED_ATTEMPT',
      result:           'blocked',
      details:          `Attempted: ${action}. Reason: ${reason}`,
      isSuspicious:     true,
      suspiciousReason: reason,
      ipAddress:        req.ip || 'unknown',
    });
  } catch (err) {
    console.error('Audit blocked log error:', err.message);
  }
};

module.exports = { auditLog, auditBlockedAttempt };