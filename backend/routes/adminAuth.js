const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const AdminUser  = require('../models/AdminUser');
const generateToken = require('../utils/generateToken');
const { protectAdmin } = require('../middleware/authMiddleware');
const allowRoles       = require('../middleware/roleMiddleware');

// ══════════════════════════════════════════════════════════════
//  ADMIN STAFF LOGIN
//  POST /api/admin-auth/login
//  Public route
// ══════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { adminId, password, branchCode } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID and password are required.'
      });
    }

    // ── Find staff member ─────────────────────────────────────
    const admin = await AdminUser.findOne({ adminId }).select('+password +loginAttempts +lockUntil');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin ID or password.'
      });
    }

    // ── Check if account is active ────────────────────────────
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact Super Admin.'
      });
    }

    // ── Check if locked ───────────────────────────────────────
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      const remainingSec = Math.ceil((admin.lockUntil - Date.now()) / 1000);
      return res.status(403).json({
        success:      false,
        locked:       true,
        message:      '🔒 Account temporarily locked due to too many failed attempts.',
        remainingSec,
      });
    }

    // ── Validate branch code if provided ──────────────────────
    if (branchCode && admin.branchCode !== branchCode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid branch code.'
      });
    }

    // ── Check password ────────────────────────────────────────
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= 5) {
        admin.lockUntil     = new Date(Date.now() + 3 * 60 * 1000);
        admin.loginAttempts = 0;
      }
      await admin.save();

      return res.status(401).json({
        success: false,
        message: 'Invalid Admin ID or password.'
      });
    }

    // ── Login successful — reset attempts ─────────────────────
    admin.loginAttempts = 0;
    admin.lockUntil     = null;
    admin.lastLogin     = new Date();
    await admin.save();

    const token = generateToken(admin._id,'admin');

    console.log(`✅ Admin login: ${admin.fullName} (${admin.role})`);

    res.status(200).json({
      success: true,
      message: `Welcome, ${admin.fullName}!`,
      token,
      user: {
        id:         admin._id,
        fullName:   admin.fullName,
        adminId:    admin.adminId,
        email:      admin.email,
        role:       admin.role,
        branchCode: admin.branchCode,
      },
    });

  } catch (err) {
    console.log('ADMIN LOGIN ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
});

// ══════════════════════════════════════════════════════════════
//  GET ALL STAFF
//  GET /api/admin-auth/staff
//  Roles: superadmin only
// ══════════════════════════════════════════════════════════════
router.get('/staff',
  protectAdmin,
  allowRoles('superadmin'),
  async (req, res) => {
    try {
      const staff = await AdminUser.find()
        .select('-password -loginAttempts -lockUntil')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, staff });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════
//  CREATE STAFF
//  POST /api/admin-auth/staff
//  Roles: superadmin only
// ══════════════════════════════════════════════════════════════
router.post('/staff',
  protectAdmin,
  allowRoles('superadmin'),
  async (req, res) => {
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

      if (existingId)    return res.status(409).json({ success: false, message: 'Admin ID already exists.' });
      if (existingEmail) return res.status(409).json({ success: false, message: 'Email already registered.' });

      const newStaff = await AdminUser.create({
        fullName, adminId, email,
        phone:      phone || '',
        password,
        role,
        branchCode: branchCode || 'HQ',
        createdBy:  req.admin?._id || null,
      });

      res.status(201).json({
        success: true,
        message: `✅ Staff member ${newStaff.fullName} created as ${role}.`,
        staff: {
          id:         newStaff._id,
          fullName:   newStaff.fullName,
          adminId:    newStaff.adminId,
          role:       newStaff.role,
          branchCode: newStaff.branchCode,
        },
      });

    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════
//  TOGGLE STAFF ACTIVE / INACTIVE
//  PATCH /api/admin-auth/staff/:id/toggle
//  Roles: superadmin only
// ══════════════════════════════════════════════════════════════
router.patch('/staff/:id/toggle',
  protectAdmin,
  allowRoles('superadmin'),
  async (req, res) => {
    try {
      const staff = await AdminUser.findById(req.params.id);
      if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

      staff.isActive = !staff.isActive;
      await staff.save();

      const status = staff.isActive ? 'activated' : 'deactivated';
      res.status(200).json({
        success: true,
        message: `Staff member ${staff.fullName} has been ${status}.`,
        isActive: staff.isActive,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
  }
);

// ══════════════════════════════════════════════════════════════
//  DELETE STAFF
//  DELETE /api/admin-auth/staff/:id
//  Roles: superadmin only
// ══════════════════════════════════════════════════════════════
router.delete('/staff/:id',
  protectAdmin,
  allowRoles('superadmin'),
  async (req, res) => {
    try {
      const staff = await AdminUser.findById(req.params.id);
      if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

      // Prevent deleting another superadmin
      if (staff.role === 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete a superadmin account.'
        });
      }

      await AdminUser.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Staff member ${staff.fullName} deleted successfully.`,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error.', error: err.message });
    }
  }
);

module.exports = router;