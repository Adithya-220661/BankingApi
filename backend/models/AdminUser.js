const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════
//  ADMIN USER MODEL
//  Roles: superadmin | manager | cashier | clerk | loan_officer
// ═══════════════════════════════════════════════════════════════

const adminUserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    fullName: {
      type:     String,
      required: true,
      trim:     true,
    },
    adminId: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    phone: {
      type:  String,
      trim:  true,
      default: '',
    },

    // ── Authentication ────────────────────────────────────────
    password: {
      type:     String,
      required: true,
      select:   false,
    },

    // ── RBAC Role ─────────────────────────────────────────────
    role: {
      type:     String,
      enum:     ['superadmin', 'manager', 'cashier', 'clerk', 'loan_officer'],
      required: true,
    },

    // ── Branch assignment ─────────────────────────────────────
    branchCode: {
      type:    String,
      default: 'HQ',
      trim:    true,
    },

    // ── Account state ─────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,
    },

    // ── Created by (superadmin who created this staff) ────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'AdminUser',
      default: null,
    },

    // ── Login security ────────────────────────────────────────
    loginAttempts: {
      type:    Number,
      default: 0,
      select:  false,
    },
    lockUntil: {
      type:    Date,
      default: null,
      select:  false,
    },
    lastLogin: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────────
adminUserSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// ── Compare password ──────────────────────────────────────────
adminUserSchema.methods.comparePassword = async function (candidate) {
  return await bcrypt.compare(candidate, this.password);
};

// ── Is account locked? ────────────────────────────────────────
adminUserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
