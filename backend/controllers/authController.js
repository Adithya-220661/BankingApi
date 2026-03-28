const User          = require('../models/User');
const AdminUser     = require('../models/AdminUser');   // ✅ NEW: import AdminUser
const OtpSession    = require('../models/OtpSession');
const generateToken = require('../utils/generateToken');
const axios         = require('axios');

// ── Lockout config ─────────────────────────────────────────────
const loginAttempts = {}; // in-memory store for wrong username attempts
const MAX_ATTEMPTS  = 3;
const LOCK_DURATION = 3 * 60 * 1000; // 3 minutes in milliseconds

// ════════════════════════════════════════════════════════════
//  TWILIO SMS SENDER
// ════════════════════════════════════════════════════════════
const sendSMS = async (phone, otp) => {
  try {
    const client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to:      `+91${phone}`,
        channel: 'sms'
      });
    console.log(`✅ Twilio Verify OTP sent to ${phone}`);
  } catch(err) {
    console.log('❌ Twilio Verify Error:', err.message);
  }
};

const verifyTwilioOTP = async (phone, otp) => {
  try {
    const client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to:   `+91${phone}`,
        code: otp
      });
    return result.status === 'approved';
  } catch(err) {
    console.log('❌ Verify Check Error:', err.message);
    return false;
  }
};

// ════════════════════════════════════════════════════════════
//  SEND OTP
// ════════════════════════════════════════════════════════════
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone number required.'
      });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered.'
      });
    }

    const client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to:      `+91${phone}`,
        channel: 'sms'
      });

    console.log(`✅ Twilio Verify OTP sent to +91${phone}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number.',
    });

  } catch (err) {
    console.log('SEND OTP ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  VERIFY OTP
// ════════════════════════════════════════════════════════════
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required.'
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits.'
      });
    }

    const isValid = await verifyTwilioOTP(phone, otp);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.'
    });

  } catch (err) {
    console.log('VERIFY OTP ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  REGISTER
// ════════════════════════════════════════════════════════════
const register = async (req, res) => {
  try {
    const {
      phone, fullName, email, pan, aadhaar, gender,
      doorNo, village, city, state, branchCode, nominee,
      kycVerified,
      username, pin,
    } = req.body;

    if (!phone || !fullName || !email || !pan || !aadhaar || !gender || !username || !pin) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits.' });
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format (e.g. ABCDE1234F).' });
    }
    if (aadhaar.length !== 12) {
      return res.status(400).json({ success: false, message: 'Aadhaar must be 12 digits.' });
    }

    const emailExists    = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });
    const panExists      = await User.findOne({ pan: pan.toUpperCase() });
    const phoneExists    = await User.findOne({ phone });

    if (emailExists)    return res.status(409).json({ success: false, message: 'Email already registered.' });
    if (usernameExists) return res.status(409).json({ success: false, message: 'Username already taken.' });
    if (panExists)      return res.status(409).json({ success: false, message: 'PAN already registered.' });
    if (phoneExists)    return res.status(409).json({ success: false, message: 'Phone already registered.' });

    const user = new User({
      phone, fullName, email,
      pan: pan.toUpperCase(),
      aadhaar, gender,
      address: { doorNo, village, city, state },
      branchCode, nominee,
      kycVerified: kycVerified || false,
      username, pin,
    });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: `Welcome to Horizon Bank, ${user.fullName}! Your account has been created.`,
      token,
      user: {
        id:            user._id,
        fullName:      user.fullName,
        username:      user.username,
        accountNumber: user.accountNumber,
        balance:       user.balance,
        phone:         user.phone,
        email:         user.email,
      },
    });
  } catch (err) {
    console.log('REGISTER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════
//  HELPER — handle failed attempt
// ════════════════════════════════════════════════════════════
const handleFailedAttempt = async (username, user, res) => {

  if (user) {
    await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { loginAttempts: 1 } },
      { returnDocument: 'after' }
    );
    const updated = await User.findById(user._id).select('+loginAttempts +lockUntil');
    console.log(`❌ Login failed for ${username}`);

    const attemptsLeft = MAX_ATTEMPTS - updated.loginAttempts;

    if (updated.loginAttempts >= MAX_ATTEMPTS) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { lockUntil: new Date(Date.now() + LOCK_DURATION) }
      );
      const remainingSec = Math.ceil(LOCK_DURATION / 1000);
      return res.status(403).json({
        success:      false,
        locked:       true,
        message:      '🔒 Account locked for 3 minutes due to too many failed attempts.',
        remainingSec,
      });
    }

    const warningMsg = attemptsLeft === 1
      ? '⚠️ Only 1 attempt remaining before account is locked for 3 minutes!'
      : `❌ Invalid username or PIN. ${attemptsLeft} attempts remaining.`;

    return res.status(401).json({
      success:      false,
      message:      warningMsg,
      attemptsLeft,
    });

  } else {
    if (!loginAttempts[username]) {
      loginAttempts[username] = { count: 0, lockUntil: null };
    }

    const record = loginAttempts[username];
    record.count += 1;
    const attemptsLeft = MAX_ATTEMPTS - record.count;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockUntil = Date.now() + LOCK_DURATION;
      const remainingSec = Math.ceil((record.lockUntil - Date.now()) / 1000);
      return res.status(403).json({
        success:      false,
        locked:       true,
        message:      '🔒 Too many failed attempts. Locked for 3 minutes.',
        remainingSec,
      });
    }

    const warningMsg = attemptsLeft === 1
      ? '⚠️ Only 1 attempt remaining before account is locked for 3 minutes!'
      : `❌ Invalid username or PIN. ${attemptsLeft} attempts remaining.`;

    return res.status(401).json({
      success:      false,
      message:      warningMsg,
      attemptsLeft,
    });
  }
};

// ════════════════════════════════════════════════════════════
//  USER LOGIN
// ════════════════════════════════════════════════════════════
const userLogin = async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ success: false, message: 'Username and PIN are required.' });
    }

    if (loginAttempts[username]) {
      const record = loginAttempts[username];
      if (record.lockUntil && record.lockUntil > Date.now()) {
        const remainingSec = Math.ceil((record.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account temporarily locked. Please try again later.',
          remainingSec,
        });
      }
      if (record.lockUntil && record.lockUntil <= Date.now()) {
        delete loginAttempts[username];
      }
    }

    const user = await User.findOne({ username }).select('+pin +loginAttempts +lockUntil');

    if (user) {
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const remainingSec = Math.ceil((user.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account temporarily locked due to too many failed attempts.',
          remainingSec,
        });
      }
      if (user.lockUntil && user.lockUntil <= Date.now()) {
        await User.findOneAndUpdate(
          { _id: user._id },
          { loginAttempts: 0, lockUntil: null }
        );
        user.loginAttempts = 0;
        user.lockUntil     = null;
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account locked. Please contact Horizon Bank support.'
        });
      }
    }

    if (!user || !(await user.comparePin(pin))) {
      return handleFailedAttempt(username, user, res);
    }

    await User.findOneAndUpdate(
      { _id: user._id },
      { loginAttempts: 0, lockUntil: null }
    );
    if (loginAttempts[username]) delete loginAttempts[username];

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      token,
      user: {
        id:            user._id,
        fullName:      user.fullName,
        username:      user.username,
        accountNumber: user.accountNumber,
        balance:       user.balance,
        phone:         user.phone,
        email:         user.email,
        role:          user.role,
      },
      redirect: 'dashboard.html',
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
//  ADMIN LOGIN
//  ✅ NOW CHECKS AdminUser collection (MongoDB: adminusers)
//  ✅ Supports: superadmin, manager, cashier, clerk, loan_officer
//  ✅ Stores: adminToken + adminUser in localStorage via response
// ════════════════════════════════════════════════════════════
const adminLogin = async (req, res) => {
  try {
    const { adminId, password, bankId } = req.body;

    // ── Validate inputs ───────────────────────────────────────
    if (!adminId || !password || !bankId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID, Password, and Bank ID are required.'
      });
    }

    // ── Validate Bank ID ──────────────────────────────────────
    if (bankId !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid Bank ID.'
      });
    }

    // ════════════════════════════════════════════════════════
    //  STEP 1: Check AdminUser collection FIRST
    //          (superadmin, manager, cashier, clerk, loan_officer)
    //          These are stored in: MongoDB → adminusers collection
    // ════════════════════════════════════════════════════════
    const adminStaff = await AdminUser.findOne({ adminId })
      .select('+password +loginAttempts +lockUntil');

    if (adminStaff) {

      // ── Check if account is active ────────────────────────
      if (!adminStaff.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Contact Super Admin.'
        });
      }

      // ── Check lockout ─────────────────────────────────────
      if (adminStaff.isLocked()) {
        const remainingSec = Math.ceil((adminStaff.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account locked due to too many failed attempts.',
          remainingSec,
        });
      }

      // ── Check password ────────────────────────────────────
      const isMatch = await adminStaff.comparePassword(password);

      if (!isMatch) {
        // Increment failed attempts
        adminStaff.loginAttempts = (adminStaff.loginAttempts || 0) + 1;
        const attemptsLeft = 5 - adminStaff.loginAttempts;

        if (adminStaff.loginAttempts >= 5) {
          adminStaff.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
          await adminStaff.save();
          return res.status(403).json({
            success:      false,
            locked:       true,
            message:      '🔒 Account locked for 15 minutes.',
            remainingSec: 15 * 60,
          });
        }

        await adminStaff.save();
        return res.status(401).json({
          success:      false,
          message:      `❌ Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
          attemptsLeft,
        });
      }

      // ── Login successful ──────────────────────────────────
      adminStaff.loginAttempts = 0;
      adminStaff.lockUntil     = null;
      adminStaff.lastLogin     = new Date();
      await adminStaff.save();

      const token = generateToken(adminStaff._id, 'admin');

      console.log(`✅ Admin Staff Login: ${adminStaff.fullName} [${adminStaff.role}]`);

      return res.status(200).json({
        success: true,
        message: `Welcome, ${adminStaff.fullName}!`,
        token,
        // ✅ Returned as 'admin' key → stored as adminUser in localStorage
        admin: {
          id:         adminStaff._id,
          fullName:   adminStaff.fullName,
          adminId:    adminStaff.adminId,
          email:      adminStaff.email,
          role:       adminStaff.role,      // manager / cashier / clerk / loan_officer / superadmin
          branchCode: adminStaff.branchCode,
        },
        // ✅ Also returned as 'user' key for backward compatibility
        user: {
          id:       adminStaff._id,
          fullName: adminStaff.fullName,
          username: adminStaff.adminId,
          role:     adminStaff.role,
        },
        redirect: 'admin.html',
      });
    }

    // ════════════════════════════════════════════════════════
    //  STEP 2: Fallback — check User collection
    //          (legacy admin with role: 'admin' in users collection)
    //          Kept for backward compatibility only
    // ════════════════════════════════════════════════════════
    const legacyAdmin = await User.findOne({
      username: adminId,
      role:     'admin'
    }).select('+pin');

    if (!legacyAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin credentials.'
      });
    }

    const isPinMatch = await legacyAdmin.comparePin(password);
    if (!isPinMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin credentials.'
      });
    }

    const token = generateToken(legacyAdmin._id, 'admin');

    console.log(`✅ Legacy Admin Login: ${legacyAdmin.fullName}`);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: {
        id:         legacyAdmin._id,
        fullName:   legacyAdmin.fullName,
        adminId:    legacyAdmin.username,
        email:      legacyAdmin.email,
        role:       'superadmin',   // treat legacy admin as superadmin
        branchCode: legacyAdmin.branchCode || 'HQ',
      },
      user: {
        id:       legacyAdmin._id,
        fullName: legacyAdmin.fullName,
        username: legacyAdmin.username,
        role:     'superadmin',
      },
      redirect: 'admin.html',
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET ME
// ════════════════════════════════════════════════════════════
const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: {
        id:            user._id,
        fullName:      user.fullName,
        username:      user.username,
        accountNumber: user.accountNumber,
        balance:       user.balance,
        phone:         user.phone,
        email:         user.email,
        gender:        user.gender,
        address:       user.address,
        branchCode:    user.branchCode,
        nominee:       user.nominee,
        kycVerified:   user.kycVerified,
        isActive:      user.isActive,
        createdAt:     user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
//  FORGOT PIN
// ════════════════════════════════════════════════════════════
const forgotPin = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone number required.'
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number.'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpSession.findOneAndUpdate(
      { phone },
      { otp, createdAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    await sendSMS(phone, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number.',
      otp_dev: otp,
    });

  } catch(err) {
    console.log('FORGOT PIN ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

// ════════════════════════════════════════════════════════════
//  RESET PIN
// ════════════════════════════════════════════════════════════
const resetPin = async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;

    if (!phone || !otp || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'Phone, OTP and new PIN are required.'
      });
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits.'
      });
    }

    const isValid = await verifyTwilioOTP(phone, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.'
      });
    }

    const user = await User.findOne({ phone }).select('+pin +loginAttempts +lockUntil');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    user.pin           = newPin;
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();

    if (loginAttempts[user.username]) {
      delete loginAttempts[user.username];
    }

    res.status(200).json({
      success: true,
      message: 'PIN reset successfully! Please login with your new PIN.'
    });

  } catch(err) {
    console.log('RESET PIN ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message
    });
  }
};

module.exports = {
  sendOtp, verifyOtp, register,
  userLogin, adminLogin,
  getMe, forgotPin, resetPin
};