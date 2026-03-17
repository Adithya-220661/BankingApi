const User       = require('../models/User');
const OtpSession = require('../models/OtpSession');
const generateToken = require('../utils/generateToken');
const axios      = require('axios');

// Fast2SMS sender helper
const sendSMS = async (phone, otp) => {
  try {
    await axios.get('https://www.fast2sms.com/dev/bulkV2', {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        variables_values: otp,
        route: 'otp',
        numbers: phone,
      }
    });
    console.log(`✅ OTP sent to ${phone}: ${otp}`);
  } catch(err) {
    console.log('❌ Fast2SMS Error:', err.message);
  }
};

// ════════════════════════════════════════════════════════════
//  REGISTRATION — matches your 5-step registration.html form
// ════════════════════════════════════════════════════════════

// STEP 1 — Send OTP
// POST /api/auth/send-otp
// Body: { phone }
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

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP session
    await OtpSession.findOneAndUpdate(
      { phone },
      { otp, createdAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    // Send real OTP via Fast2SMS
    await sendSMS(phone, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number.',
      otp_dev: otp, // remove this line in production
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// STEP 1 — Verify OTP
// POST /api/auth/verify-otp
// Body: { phone, otp }
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

    // OTP verified — clean up
    await OtpSession.deleteOne({ phone });

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// STEPS 2–5 — Complete Registration (final submit)
// POST /api/auth/register
// Body: all form fields from steps 2-4
const register = async (req, res) => {
  try {
    const {
      phone, fullName, email, pan, aadhaar, gender,
      doorNo, village, city, state, branchCode, nominee,
      kycVerified,
      username, pin,
    } = req.body;

    // Validate required fields
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

    // Check for duplicates
    const emailExists    = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });
    const panExists      = await User.findOne({ pan: pan.toUpperCase() });
    const phoneExists    = await User.findOne({ phone });

    if (emailExists)    return res.status(409).json({ success: false, message: 'Email already registered.' });
    if (usernameExists) return res.status(409).json({ success: false, message: 'Username already taken.' });
    if (panExists)      return res.status(409).json({ success: false, message: 'PAN already registered.' });
    if (phoneExists)    return res.status(409).json({ success: false, message: 'Phone already registered.' });

    // Create user
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
//  USER LOGIN — matches your loginModal "User" tab
// ════════════════════════════════════════════════════════════

// POST /api/auth/login
// Body: { username, pin }
const userLogin = async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ success: false, message: 'Username and PIN are required.' });
    }

    // Find user and include pin field
    const user = await User.findOne({ username }).select('+pin');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or PIN.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account locked. Please contact Horizon Bank support.' });
    }

    const isPinMatch = await user.comparePin(pin);
    if (!isPinMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or PIN.' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
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
//  ADMIN LOGIN — matches your loginModal "Admin" tab
// ════════════════════════════════════════════════════════════

// POST /api/auth/admin-login
// Body: { adminId, password, bankId }
const adminLogin = async (req, res) => {
  try {
    const { adminId, password, bankId } = req.body;
    if (!adminId || !password || !bankId) {
      return res.status(400).json({ success: false, message: 'Admin ID, Password, and Bank ID are required.' });
    }

    // Validate the bank-level secret key (your "Bank ID" field in admin form)
    if (bankId !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid Bank ID.' });
    }

    // Find admin user by username (adminId field)
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

// GET /api/auth/me — get current logged-in user profile
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
// ── FORGOT PIN ────────────────────────────────────────────────
const forgotPin = async (req, res) => {
  try {
    const { phone } = req.body;

    if(!phone || phone.length !== 10){
      return res.status(400).json({
        success: false,
        message: 'Valid 10-digit phone number required.'
      });
    }

    // Check if phone exists in database
    const user = await User.findOne({ phone });
    if(!user){
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number.'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP session
    await OtpSession.findOneAndUpdate(
      { phone },
      { otp, createdAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    // Send real OTP via Fast2SMS
    await sendSMS(phone, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your phone number.',
      otp_dev: otp, // remove this line in production
    });

  } catch(err) {
    console.log('FORGOT PIN ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

// ── RESET PIN ─────────────────────────────────────────────────
const resetPin = async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;

    if(!phone || !otp || !newPin){
      return res.status(400).json({
        success: false,
        message: 'Phone, OTP and new PIN are required.'
      });
    }

    if(newPin.length !== 4 || !/^\d{4}$/.test(newPin)){
      return res.status(400).json({
        success: false,
        message: 'PIN must be exactly 4 digits.'
      });
    }

    // Verify OTP
    const session = await OtpSession.findOne({ phone });
    if(!session){
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request again.'
      });
    }
    if(session.otp !== otp){
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP. Please try again.'
      });
    }

    // Delete OTP session
    await OtpSession.deleteOne({ phone });

    // Find user and update PIN
    const user = await User.findOne({ phone }).select('+pin');
    if(!user){
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Hash new PIN and save
    user.pin = newPin;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'PIN reset successfully! Please login with your new PIN.'
    });

  } catch(err) {
    console.log('RESET PIN ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: err.message
    });
  }
};

module.exports = { sendOtp, verifyOtp, register, userLogin, adminLogin, getMe,forgotPin,resetPin  };