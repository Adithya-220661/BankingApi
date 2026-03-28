const AdminUser      = require('../models/AdminUser');
const AuditLog       = require('../models/AuditLog');
const generateToken  = require('../utils/generateToken');

const MAX_ATTEMPTS  = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

// ═══════════════════════════════════════════════════════════════
//  ADMIN STAFF LOGIN
//  POST /api/admin-auth/login
// ═══════════════════════════════════════════════════════════════
const adminStaffLogin = async (req, res) => {
  try {
    const { adminId, password, bankId } = req.body;

    if (!adminId || !password || !bankId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID, Password, and Bank ID are required.',
      });
    }

    // ── Bank ID validation DISABLED for testing ─────────────────
    // if (bankId !== process.env.ADMIN_SECRET_KEY) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Invalid Bank ID.',
    //   });
    // }
    console.log('Bank ID bypassed:', bankId);

    // ── Find admin staff ──────────────────────────────────────
    const admin = await AdminUser.findOne({ adminId })
      .select('+password +loginAttempts +lockUntil');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // ── Check if account is locked ────────────────────────────
    if (admin.isLocked()) {
      const remainingSec = Math.ceil((admin.lockUntil - Date.now()) / 1000);
      return res.status(403).json({
        success:      false,
        locked:       true,
        message:      '🔒 Account locked due to too many failed attempts.',
        remainingSec,
      });
    }

    // ── Check if account is active ────────────────────────────
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact Super Admin.',
      });
    }

    // ── Check password ────────────────────────────────────────
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      // Increment failed attempts
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;

      if (admin.loginAttempts >= MAX_ATTEMPTS) {
        admin.lockUntil = new Date(Date.now() + LOCK_DURATION);
        await admin.save();
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account locked for 15 minutes.',
          remainingSec: Math.ceil(LOCK_DURATION / 1000),
        });
      }

      await admin.save();
      return res.status(401).json({
        success:      false,
        message:      `Invalid credentials. ${MAX_ATTEMPTS - admin.loginAttempts} attempts remaining.`,
        attemptsLeft: MAX_ATTEMPTS - admin.loginAttempts,
      });
    }

    // ── Login successful ──────────────────────────────────────
    admin.loginAttempts = 0;
    admin.lockUntil     = null;
    admin.lastLogin     = new Date();
    await admin.save();

    // Log the login
    await AuditLog.create({
      adminId:   admin._id,
      adminName: admin.fullName,
      adminRole: admin.role,
      action:    'LOGIN',
      result:    'success',
      details:   `${admin.fullName} [${admin.role}] logged in`,
      ipAddress: req.ip || 'unknown',
    });

    const token = generateToken(admin._id, 'admin');

    return res.status(200).json({
      success: true,
      message: `Welcome, ${admin.fullName}!`,
      token,
      admin: {
        id:         admin._id,
        fullName:   admin.fullName,
        adminId:    admin.adminId,
        email:      admin.email,
        role:       admin.role,
        branchCode: admin.branchCode,
      },
      redirect: 'admin.html',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  CREATE STAFF (Super Admin only)
//  POST /api/admin-auth/staff
// ═══════════════════════════════════════════════════════════════
const createStaff = async (req, res) => {
  try {
    const { fullName, adminId, email, phone, password, role, branchCode } = req.body;

    if (!fullName || !adminId || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'fullName, adminId, email, password, and role are required.',
      });
    }

    const validRoles = ['manager', 'cashier', 'clerk', 'loan_officer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // ── Check duplicates ──────────────────────────────────────
    const existingId    = await AdminUser.findOne({ adminId });
    const existingEmail = await AdminUser.findOne({ email });
    if (existingId)    return res.status(409).json({ success: false, message: 'Admin ID already exists.' });
    if (existingEmail) return res.status(409).json({ success: false, message: 'Email already exists.' });

    const staff = await AdminUser.create({
      fullName,
      adminId,
      email,
      phone:      phone || '',
      password,
      role,
      branchCode: branchCode || 'HQ',
      createdBy:  req.admin._id,
    });

    // Audit log
    await AuditLog.create({
      adminId:   req.admin._id,
      adminName: req.admin.fullName,
      adminRole: req.admin.role,
      action:    'CREATE_STAFF',
      result:    'success',
      details:   `Created ${role} account for ${fullName} (${adminId})`,
      ipAddress: req.ip || 'unknown',
    });

    res.status(201).json({
      success: true,
      message: `✅ Staff account created for ${fullName}`,
      staff: {
        id:         staff._id,
        fullName:   staff.fullName,
        adminId:    staff.adminId,
        email:      staff.email,
        role:       staff.role,
        branchCode: staff.branchCode,
        isActive:   staff.isActive,
        createdAt:  staff.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET ALL STAFF (Super Admin only)
//  GET /api/admin-auth/staff
// ═══════════════════════════════════════════════════════════════
const getAllStaff = async (req, res) => {
  try {
    const staff = await AdminUser.find({ role: { $ne: 'superadmin' } })
      .sort({ createdAt: -1 })
      .select('-password');

    res.status(200).json({ success: true, staff });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  DELETE STAFF (Super Admin only)
//  DELETE /api/admin-auth/staff/:id
// ═══════════════════════════════════════════════════════════════
const deleteStaff = async (req, res) => {
  try {
    const staff = await AdminUser.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    if (staff.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot delete Super Admin.' });
    }

    await AdminUser.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      adminId:   req.admin._id,
      adminName: req.admin.fullName,
      adminRole: req.admin.role,
      action:    'DELETE_STAFF',
      result:    'success',
      details:   `Deleted ${staff.role} account: ${staff.fullName} (${staff.adminId})`,
      ipAddress: req.ip || 'unknown',
    });

    res.status(200).json({ success: true, message: `Staff ${staff.fullName} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  TOGGLE STAFF ACTIVE (Super Admin only)
//  PATCH /api/admin-auth/staff/:id/toggle
// ═══════════════════════════════════════════════════════════════
const toggleStaffActive = async (req, res) => {
  try {
    const staff = await AdminUser.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
    if (staff.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate Super Admin.' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    await AuditLog.create({
      adminId:   req.admin._id,
      adminName: req.admin.fullName,
      adminRole: req.admin.role,
      action:    staff.isActive ? 'ACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
      result:    'success',
      details:   `${staff.isActive ? 'Activated' : 'Deactivated'} ${staff.role}: ${staff.fullName}`,
      ipAddress: req.ip || 'unknown',
    });

    res.status(200).json({
      success:  true,
      message:  `Staff account ${staff.isActive ? 'activated' : 'deactivated'}.`,
      isActive: staff.isActive,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET MY PROFILE
//  GET /api/admin-auth/me
// ═══════════════════════════════════════════════════════════════
const getAdminMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      admin: {
        id:         req.admin._id,
        fullName:   req.admin.fullName,
        adminId:    req.admin.adminId,
        email:      req.admin.email,
        role:       req.admin.role,
        branchCode: req.admin.branchCode,
        isActive:   req.admin.isActive,
        lastLogin:  req.admin.lastLogin,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = {
  adminStaffLogin,
  createStaff,
  getAllStaff,
  deleteStaff,
  toggleStaffActive,
  getAdminMe,
};
