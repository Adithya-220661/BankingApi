const User          = require('../models/User');
const OtpSession    = require('../models/OtpSession');
const generateToken = require('../utils/generateToken');
const axios         = require('axios');

const loginAttempts = {};
const MAX_ATTEMPTS  = 3;
const LOCK_DURATION = 3 * 60 * 1000;

const sendSMS = async (phone, otp) => {
  try {
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
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
    await OtpSession.findOneAndUpdate({ phone }, { otp, createdAt: new Date() }, { upsert: true, returnDocument: 'after' });
    await sendSMS(phone, otp);
    res.status(200).json({ success: true, message: 'OTP sent to your phone number.', otp_dev: otp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

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

const register = async (req, res) => {
  try {
    const { phone, fullName, email, pan, aadhaar, gender, doorNo, village, city, state, branchCode, nominee, kycVerified, username, pin } = req.body;
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
    const user = new User({ phone, fullName, email, pan: pan.toUpperCase(), aadhaar, gender, address: { doorNo, village, city, state }, branchCode, nominee, kycVerified: kycVerified || false, username, pin });
    await user.save();
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: `Welcome to Horizon Bank, ${user.fullName}! Your account has been created.`,
      token,
      user: { id: user._id, fullName: user.fullName, username: user.username, accountNumber: user.accountNumber, balance: user.balance, phone: user.phone, email: user.email },
    });
  } catch (err) {
    console.log('REGISTER ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getWarningMessage = (attemptsLeft) => {
  if (attemptsLeft === 1) {
    return `⚠️ Only 1 attempt remaining! Account will be locked for 3 minutes after next failure.`;
  } else if (attemptsLeft > 1) {
    return `❌ Invalid username or PIN. ${attemptsLeft} attempts remaining.`;
  } else {
    return `⚠️ This was your last attempt! Account is now locked for 3 minutes.`;
  }
};

const handleFailedAttempt = async (username, user, res) => {
  if (user) {
    await User.findOneAndUpdate({ _id: user._id }, { $inc: { loginAttempts: 1 } });
    const updated = await User.findById(user._id).select('+loginAttempts +lockUntil');
    console.log(`❌ Failed: ${username} | attempts: ${updated.loginAttempts} | left: ${MAX_ATTEMPTS - updated.loginAttempts}`);
    const attemptsLeft = MAX_ATTEMPTS - updated.loginAttempts;
    if (updated.loginAttempts >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_DURATION);
      await User.findOneAndUpdate({ _id: user._id }, { lockUntil });
      const remainingSec = Math.ceil(LOCK_DURATION / 1000);
      return res.status(403).json({ success: false, locked: true, message: '🔒 Account locked for 3 minutes due to too many failed attempts.', remainingSec, attemptsLeft: 0 });
    }
    return res.status(401).json({ success: false, locked: false, message: getWarningMessage(attemptsLeft), attemptsLeft });
  } else {
    if (!loginAttempts[username]) {
      loginAttempts[username] = { count: 0, lockUntil: null };
    }
    const record = loginAttempts[username];
    record.count += 1;
    console.log(`❌ Failed (not found): ${username} | count: ${record.count} | left: ${MAX_ATTEMPTS - record.count}`);
    const attemptsLeft = MAX_ATTEMPTS - record.count;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockUntil   = Date.now() + LOCK_DURATION;
      const remainingSec = Math.ceil((record.lockUntil - Date.now()) / 1000);
      return res.status(403).json({ success: false, locked: true, message: '🔒 Too many failed attempts. Locked for 3 minutes.', remainingSec, attemptsLeft: 0 });
    }
    return res.status(401).json({ success: false, locked: false, message: getWarningMessage(attemptsLeft), attemptsLeft });
  }
};

// ════════════════════════════════════════════════════════════
//  USER LOGIN
//  ✅ LOCKOUT CHECK IS FIRST — before PIN verification
//  ✅ Correct PIN during lockout → still blocked
// ════════════════════════════════════════════════════════════
const userLogin = async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ success: false, message: 'Username and PIN are required.' });
    }

    // ── STEP 1: Check in-memory lockout FIRST ─────────────────
    if (loginAttempts[username]) {
      const record = loginAttempts[username];
      if (record.lockUntil && record.lockUntil > Date.now()) {
        const remainingSec = Math.ceil((record.lockUntil - Date.now()) / 1000);
        return res.status(403).json({
          success: false, locked: true,
          message: '🔒 Account temporarily locked. Please wait.',
          remainingSec,
        });
      }
      if (record.lockUntil && record.lockUntil <= Date.now()) {
        delete loginAttempts[username];
      }
    }

    // ── STEP 2: Find user ──────────────────────────────────────
    const user = await User.findOne({ username }).select('+pin +loginAttempts +lockUntil');

    // ── STEP 3: Check DB lockout BEFORE PIN check ──────────────
    // ✅ Even correct PIN cannot bypass lockout!
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const remainingSec = Math.ceil((user.lockUntil - Date.now()) / 1000);
      return res.status(403).json({
        success: false, locked: true,
        message: '🔒 Account temporarily locked. Please wait.',
        remainingSec,
      });
    }

    // ── STEP 4: Reset expired lockout ─────────────────────────
    if (user && user.lockUntil && user.lockUntil <= Date.now()) {
      await User.findOneAndUpdate({ _id: user._id }, { loginAttempts: 0, lockUntil: null });
      user.loginAttempts = 0;
      user.lockUntil     = null;
    }

    // ── STEP 5: Check isActive ─────────────────────────────────
    if (user && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account locked. Please contact Horizon Bank support.'
      });
    }

    // ── STEP 6: Verify PIN — only reaches here if NOT locked ───
    if (!user || !(await user.comparePin(pin))) {
      return handleFailedAttempt(username, user, res);
    }

    // ── STEP 7: Login success — reset all attempts ─────────────
    await User.findOneAndUpdate({ _id: user._id }, { loginAttempts: 0, lockUntil: null });
    if (loginAttempts[username]) delete loginAttempts[username];

    const token = generateToken(user._id);
    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      token,
      user: {
        id: user._id, fullName: user.fullName, username: user.username,
        accountNumber: user.accountNumber, balance: user.balance,
        phone: user.phone, email: user.email, role: user.role,
      },
      redirect: 'dashboard.html',
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

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
      success: true, message: 'Admin login successful.', token,
      user: { id: admin._id, fullName: admin.fullName, username: admin.username, role: admin.role },
      redirect: 'admin.html',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      user: {
        id: user._id, fullName: user.fullName, username: user.username,
        accountNumber: user.accountNumber, balance: user.balance,
        phone: user.phone, email: user.email, gender: user.gender,
        address: user.address, branchCode: user.branchCode,
        nominee: user.nominee, kycVerified: user.kycVerified,
        isActive: user.isActive, createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

const forgotPin = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit phone number required.' });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this phone number.' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpSession.findOneAndUpdate({ phone }, { otp, createdAt: new Date() }, { upsert: true, returnDocument: 'after' });
    await sendSMS(phone, otp);
    res.status(200).json({ success: true, message: 'OTP sent to your phone number.', otp_dev: otp });
  } catch(err) {
    console.log('FORGOT PIN ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

const resetPin = async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;
    if (!phone || !otp || !newPin) {
      return res.status(400).json({ success: false, message: 'Phone, OTP and new PIN are required.' });
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits.' });
    }
    const session = await OtpSession.findOne({ phone });
    if (!session) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request again.' });
    }
    if (session.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });
    }
    await OtpSession.deleteOne({ phone });
    const user = await User.findOne({ phone }).select('+pin +loginAttempts +lockUntil');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    user.pin           = newPin;
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();
    if (loginAttempts[user.username]) delete loginAttempts[user.username];
    res.status(200).json({ success: true, message: 'PIN reset successfully! Please login with your new PIN.' });
  } catch(err) {
    console.log('RESET PIN ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { sendOtp, verifyOtp, register, userLogin, adminLogin, getMe, forgotPin, resetPin };