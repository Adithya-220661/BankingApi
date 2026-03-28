const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const AdminUser = require('../models/AdminUser');

// ═══════════════════════════════════════════════════════════════
//  protect — for regular customer routes
// ═══════════════════════════════════════════════════════════════
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. Please login.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been locked. Contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please login again.' });
  }
};

// ═══════════════════════════════════════════════════════════════
//  protectAdmin — for OLD admin routes (legacy User.role=admin)
//  kept for backward compatibility
// ═══════════════════════════════════════════════════════════════
const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin access required.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Admin Token:", decoded);

    // ── Check AdminUser collection first (new RBAC system) ────
    const adminStaff = await AdminUser.findById(decoded.id);
    if (adminStaff) {
      if (!adminStaff.isActive) {
        return res.status(403).json({ success: false, message: 'Your admin account has been deactivated.' });
      }
      req.admin = adminStaff;
      req.user  = adminStaff; // for backwards compat
      return next();
    }

    // ── Fallback: check User collection with role=admin ───────
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden. Admin only.' });
    }

    // Wrap legacy admin as admin object
    req.admin = {
      _id:      user._id,
      fullName: user.fullName,
      adminId:  user.username,
      role:     'superadmin', // treat legacy admin as superadmin
      isActive: user.isActive,
    };
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session.' });
  }
};

// ═══════════════════════════════════════════════════════════════
//  protectAdminStaff — for NEW RBAC admin staff routes
//  Authenticates against AdminUser collection only
// ═══════════════════════════════════════════════════════════════
const protectAdminStaff = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin staff access required.' });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await AdminUser.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found.' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Super Admin.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session.' });
  }
};

module.exports = { protect, protectAdmin, protectAdminStaff };
