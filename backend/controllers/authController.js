const User          = require('../models/User');
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
    await client.messages.create({
      body: `Your Horizon Bank OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      from: process.env.TWILIO_PHONE,
      to:   `+91${phone}`
    });
    console.log(`✅ OTP SMS sent to ${phone}: ${otp}`);
  } catch(err) {
    console.log('❌ Twilio SMS Error:', err.message);
  }
};

// ════════════════════════════════════════════════════════════
//  SEND OTP
// ════════════════════════════════════════════════════════════
const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number required.' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
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

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
//  VERIFY OTP
// ════════════════════════════════════════════════════════════
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
    }

    const session = await OtpSession.findOne({ phone });
    if (!session) {
      return res.status(400).json({ success: false, message: 'OTP expired or not sent. Please resend.' });
    }
    if (session.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }

    await OtpSession.deleteOne({ phone });

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
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
    // ── User exists → store in DATABASE ──────────────────────
     const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { loginAttempts: 1 } },
      { new: true, select: '+loginAttempts +lockUntil' }
    );
    console.log(`❌ Login failed for ${username}`);
    console.log(`📊 loginAttempts: ${updated.loginAttempts}`);
    console.log(`📊 attemptsLeft: ${MAX_ATTEMPTS - updated.loginAttempts}`);

    const attemptsLeft = MAX_ATTEMPTS - updated.loginAttempts;

    if (updated.loginAttempts >= MAX_ATTEMPTS) {
      // Lock the account
      await User.findOneAndUpdate(
        { _id: user._id },
        { lockUntil: new Date(Date.now() + LOCK_DURATION) }
      );

      // ✅ Calculate exact remaining seconds from lockUntil
      const remainingSec = Math.ceil(LOCK_DURATION  / 1000);

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
    // ── User not found → store in MEMORY ─────────────────────
    if (!loginAttempts[username]) {
      loginAttempts[username] = { count: 0, lockUntil: null };
    }

    const record = loginAttempts[username];
    record.count += 1;
    const attemptsLeft = MAX_ATTEMPTS - record.count;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockUntil = Date.now() + LOCK_DURATION;

      // ✅ Calculate exact remaining seconds
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

    // ── Check in-memory lockout first (wrong username attempts) ──
    if (loginAttempts[username]) {
      const record = loginAttempts[username];

      if (record.lockUntil && record.lockUntil > Date.now()) {
        // ✅ Calculate REMAINING seconds — not from start!
        const remainingSec = Math.ceil((record.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account temporarily locked. Please try again later.',
          remainingSec, // ← exact remaining time
        });
      }

      // Reset if expired
      if (record.lockUntil && record.lockUntil <= Date.now()) {
        delete loginAttempts[username];
      }
    }

    const user = await User.findOne({ username }).select('+pin +loginAttempts +lockUntil');

    // ── Check DB lockout (wrong PIN attempts) ─────────────────
    if (user) {

      if (user.lockUntil && user.lockUntil > Date.now()) {
        // ✅ Calculate REMAINING seconds from lockUntil — not from start!
        const remainingSec = Math.ceil((user.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success:      false,
          locked:       true,
          message:      '🔒 Account temporarily locked due to too many failed attempts.',
          remainingSec, // ← exact remaining time
        });
      }

      // Reset DB lockout if expired
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

    // ── Wrong username OR wrong PIN → reduce attempts ─────────
    if (!user || !(await user.comparePin(pin))) {
      return handleFailedAttempt(username, user, res);
    }

    // ── Login successful → reset ALL attempts ─────────────────
    await User.findOneAndUpdate(
        { _id: user._id },
        { loginAttempts: 0, lockUntil: null }
    );

    // Also clear memory attempts if any
    if (loginAttempts[username]) {
      delete loginAttempts[username];
    }

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
// ════════════════════════════════════════════════════════════
const adminLogin = async (req, res) => {
  try {
    const { adminId, password, bankId } = req.body;
    if (!adminId || !password || !bankId) {
      return res.status(400).json({ success: false, message: 'Admin ID, Password, and Bank ID are required.' });
    }

    if (bankId !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid Bank ID.' });
    }

    const admin = await User.findOne({ username: adminId, role: 'admin' }).select('+pin');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }

    const isPinMatch = await admin.comparePin(password);
    if (!isPinMatch) {
      return res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }

    const token = generateToken(admin._id);

    res.status(200).json({
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
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
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

    const session = await OtpSession.findOne({ phone });
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request again.'
      });
    }
    if (session.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.'
      });
    }

    await OtpSession.deleteOne({ phone });

    const user = await User.findOne({ phone }).select('+pin +loginAttempts +lockUntil');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // ✅ Reset PIN and clear ALL lockout
    user.pin           = newPin;
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();

    // Also clear memory lockout
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

module.exports = { sendOtp, verifyOtp, register, userLogin, adminLogin, getMe, forgotPin, resetPin };