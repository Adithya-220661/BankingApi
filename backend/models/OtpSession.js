const mongoose = require('mongoose');

// Stores OTPs temporarily during registration (Step 1)
// Auto-deletes after 10 minutes via MongoDB TTL index
const otpSessionSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // auto-delete after 10 minutes
  },
});

module.exports = mongoose.model('OtpSession', otpSessionSchema);