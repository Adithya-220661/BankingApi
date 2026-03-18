const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Matches your registration.html 5-step form exactly ───────
const userSchema = new mongoose.Schema(
  {
    // ── Step 1: OTP Verification ──────────────────────────────
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ── Step 2: Personal Details ──────────────────────────────
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    pan: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    aadhaar: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    address: {
      doorNo:  { type: String, default: '' },
      village: { type: String, default: '' },
      city:    { type: String, default: '' },
      state:   { type: String, default: '' },
    },
    branchCode: {
      type: String,
      default: '',
    },
    nominee: {
      type: String,
      default: '',
    },

    // ── Step 3: KYC ───────────────────────────────────────────
    kycVerified: {
      type: Boolean,
      default: false,
    },

    // ── Step 4: Security Setup ────────────────────────────────
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    pin: {
      type: String,
      required: true,
      select: false, // Never returned in queries
    },

    // ── Auto-generated on account creation ───────────────────
    accountNumber: {
      type: String,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Account control (used by Admin) ──────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// ── Pre-save hooks ────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 12);
  }
  if (this.isNew) {
    this.accountNumber = 'HB' + Date.now().toString().slice(-9);
  }
});

// ── Instance method: compare PIN ──────────────────────────────
userSchema.methods.comparePin = async function (candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

module.exports = mongoose.model('User', userSchema);