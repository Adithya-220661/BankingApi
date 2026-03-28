// ═══════════════════════════════════════════════════════════════
//  ROLE MIDDLEWARE  — Role-Based Access Control (RBAC)
//  Usage: allowRoles('superadmin', 'manager', 'cashier')
//  Must be used AFTER protectAdmin or protectAdminStaff
// ═══════════════════════════════════════════════════════════════

const allowRoles = (...roles) => {
  return (req, res, next) => {

    // ── Get the logged-in admin from request ──────────────────
    // protectAdmin / protectAdminStaff sets req.admin
    const admin = req.admin;

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login as admin staff.'
      });
    }

    // ── Check if their role is in the allowed list ────────────
    if (!roles.includes(admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of these roles: ${roles.join(', ')}. Your role: ${admin.role}.`
      });
    }

    // ── Role is allowed — proceed ─────────────────────────────
    next();
  };
};

module.exports = allowRoles;