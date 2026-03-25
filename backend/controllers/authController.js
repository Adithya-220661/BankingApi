const User          = require('../models/User');
const OtpSession    = require('../models/OtpSession');
const generateToken = require('../utils/generateToken');

// ── Twilio singleton ────────────────────────────────────────────
const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Lockout config ──────────────────────────────────────────────
const loginAttempts = {}; // in-memory store for wrong username attempts
const MAX_ATTEMPTS  = 3;
const LOCK_DURATION = 1 * 60 * 1000; // 1 minute in milliseconds

// ════════════════════════════════════════════════════════════
//  TWILIO HELPERS
// ════════════════════════════════════════════════════════════

const sendTwilioOTP = async (phone) => {
  await twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SID)
    .verifications.create({
      to:      `+91${phone}`,
      channel: 'sms',
    });
  console.log(`✅ Twilio Verify OTP sent to +91${phone}`);
};

const verifyTwilioOTP = async (phone, otp) => {
  try {
    const result = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to:   `+91${phone}`,
        code: otp,
      });
    return result.status === 'approved';
  } catch (err) {
    console.log('❌ Verify Check Error:', err.message);
    return false;
  }
};

// ════════════════════════════════════════════════════════════
//  SEND OTP  (Registration)
// ════════════════════════════════════════════════════════════
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone number required.',
      });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered.',
      });
    }

    await sendTwilioOTP(phone);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number.',
    });

  } catch (err) {
    console.log('SEND OTP ERROR:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
    });
  }
};

// ════════════════════════════════════════════════════════════
//  VERIFY OTP  (Registration)
// ════════════════════════════════════════════════════════════
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required.',
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits.',
      });
    }

    const isValid = await verifyTwilioOTP(phone, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });

  } catch (err) {
    console.log('VERIFY OTP ERROR:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
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
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled.',
      });
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits.',
      });
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PAN format (e.g. ABCDE1234F).',
      });
    }
    if (aadhaar.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar must be 12 digits.',
      });
    }

    const [emailExists, usernameExists, panExists, phoneExists] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username }),
      User.findOne({ pan: pan.toUpperCase() }),
      User.findOne({ phone }),
    ]);

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

    return res.status(201).json({
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
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ════════════════════════════════════════════════════════════
//  HELPER — handle failed login attempt
// ════════════════════════════════════════════════════════════
const handleFailedAttempt = async (username, user, res) => {

  if (user) {
    // ── Known user → track in DB ──────────────────────────────
    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { loginAttempts: 1 } },
      { new: true }
    ).select('+loginAttempts +lockUntil');

    console.log(`❌ Login failed for "${username}" — attempt #${updated.loginAttempts}`);

    const attemptsLeft = MAX_ATTEMPTS - updated.loginAttempts;

    if (updated.loginAttempts >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION);
      await User.findOneAndUpdate({ _id: user._id }, { lockUntil });

      const remainingSec = Math.ceil(LOCK_DURATION / 1000);
      return res.status(403).json({
        success:      false,
        locked:       true,
        message:      '🔒 Account locked for 1 minute due to too many failed attempts.',
        remainingSec,
      });
    }

    const warningMsg = attemptsLeft === 1
      ? '⚠️ Only 1 attempt remaining before account is locked for 1 minute!'
      : `❌ Invalid credentials. ${attemptsLeft} attempts remaining.`;

    return res.status(401).json({
      success:      false,
      message:      warningMsg,
      attemptsLeft,
    });

  } else {
    // ── Unknown user → track in memory ───────────────────────
    if (!loginAttempts[username]) {
      loginAttempts[username] = { count: 0, lockUntil: null };
    }

    const record = loginAttempts[username];
    record.count += 1;
    const attemptsLeft = MAX_ATTEMPTS - record.count;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockUntil = Date.now() + LOCK_DURATION;
      const remainingSec = Math.ceil(LOCK_DURATION / 1000);
      return res.status(403).json({
        success:      false,
        locked:       true,
        message:      '🔒 Too many failed attempts. Locked for 1 minute.',
        remainingSec,
      });
    }

    const warningMsg = attemptsLeft === 1
      ? '⚠️ Only 1 attempt remaining before account is locked for 1 minute!'
      : `❌ Invalid credentials. ${attemptsLeft} attempts remaining.`;

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
      return res.status(400).json({
        success: false,
        message: 'Username and PIN are required.',
      });
    }

    // ── Check in-memory lockout (unknown username attempts) ───
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

      // Expired → clear
      if (record.lockUntil && record.lockUntil <= Date.now()) {
        delete loginAttempts[username];
      }
    }

    const user = await User.findOne({ username }).select('+pin +loginAttempts +lockUntil');

    if (user) {
      // ── Check DB lockout ──────────────────────────────────
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const remainingSec = Math.ceil((user.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account temporarily locked due to too many failed attempts.',
          remainingSec,
        });
      }

      // Expired DB lockout → reset
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
          message: 'Account locked. Please contact Horizon Bank support.',
        });
      }
    }

    // ── Wrong username OR wrong PIN → handle failed attempt ───
    if (!user || !(await user.comparePin(pin))) {
      return handleFailedAttempt(username, user, res);
    }

    // ── Success → reset all lockout state ─────────────────────
    await User.findOneAndUpdate(
      { _id: user._id },
      { loginAttempts: 0, lockUntil: null }
    );
    if (loginAttempts[username]) {
      delete loginAttempts[username];
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success:  true,
      message:  `Welcome back, ${user.fullName}!`,
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
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
    });
  }
};

// ════════════════════════════════════════════════════════════
//  ADMIN LOGIN
// ════════════════════════════════════════════════════════════
const adminLogin = async (req, res) => {
  try {
    const { adminId, password, bankId } = req.body;

    if (!adminId || !password || !bankId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID, Password, and Bank ID are required.',
      });
    }

    if (bankId !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid Bank ID.' });
    }

    const admin = await User.findOne({ username: adminId, role: 'admin' }).select('+pin');
    if (!admin || !(await admin.comparePin(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin credentials.',
      });
    }

    const token = generateToken(admin._id);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      user: {
        id:       admin._id,
        fullName: admin.fullName,
        username: admin.username,
        role:     admin.role,
      },
      redirect: 'admin.html',
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
    });
  }
};

// ════════════════════════════════════════════════════════════
//  GET ME
// ════════════════════════════════════════════════════════════
const getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
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
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
    });
  }
};

// ════════════════════════════════════════════════════════════
//  FORGOT PIN  — sends OTP via Twilio Verify
// ════════════════════════════════════════════════════════════
const forgotPin = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone number required.',
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number.',
      });
    }

    // Twilio Verify generates and sends its own OTP — no local OTP needed
    await sendTwilioOTP(phone);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number.',
    });

  } catch (err) {
    console.log('FORGOT PIN ERROR:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
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
        message: 'Phone, OTP and new PIN are required.',
      });
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits.',
      });
    }

    const isValid = await verifyTwilioOTP(phone, otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.',
      });
    }

    const user = await User.findOne({ phone }).select('+pin +loginAttempts +lockUntil');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.pin           = newPin;
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();

    if (loginAttempts[user.username]) {
      delete loginAttempts[user.username];
    }

    return res.status(200).json({
      success: true,
      message: 'PIN reset successfully! Please login with your new PIN.',
    });

  } catch (err) {
    console.log('RESET PIN ERROR:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error.',
      error:   err.message,
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  register,
  userLogin,
  adminLogin,
  getMe,
  forgotPin,
  resetPin,
};