const nodemailer = require('nodemailer');
const User       = require('../models/User');

// ════════════════════════════════════════════════════════════
//  NODEMAILER TRANSPORTER
// ════════════════════════════════════════════════════════════
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_EMAIL_PASS,
  },
});

// ════════════════════════════════════════════════════════════
//  SUBMIT COMPLAINT
// ════════════════════════════════════════════════════════════
const submitComplaint = async (req, res) => {
  try {
    const { complaintType, fullName, accountNumber, email, mobile, description } = req.body;

    // ── Validate required fields ──────────────────────────────
    if (!complaintType || !fullName || !accountNumber || !email || !mobile || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    // ── Fetch admin email from MongoDB ────────────────────────
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'Admin not found in database.',
      });
    }
    const adminEmail = admin.email;

    // ── Generate complaint ID ─────────────────────────────────
    const complaintId = 'HB' + Date.now() + Math.floor(Math.random() * 1000);
    const submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // ── Admin email HTML ──────────────────────────────────────
    const adminHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">'
      + '<div style="background:#002970;padding:20px 30px;">'
      + '<h2 style="color:white;margin:0;">Horizon Bank - Complaint Received</h2>'
      + '</div>'
      + '<div style="padding:25px 30px;">'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<tr style="background:#f5f7fb;"><td style="padding:10px;font-weight:bold;width:40%;">Complaint ID</td><td style="padding:10px;">' + complaintId + '</td></tr>'
      + '<tr><td style="padding:10px;font-weight:bold;">Type</td><td style="padding:10px;">' + complaintType + '</td></tr>'
      + '<tr style="background:#f5f7fb;"><td style="padding:10px;font-weight:bold;">Full Name</td><td style="padding:10px;">' + fullName + '</td></tr>'
      + '<tr><td style="padding:10px;font-weight:bold;">Account Number</td><td style="padding:10px;">' + accountNumber + '</td></tr>'
      + '<tr style="background:#f5f7fb;"><td style="padding:10px;font-weight:bold;">Email</td><td style="padding:10px;">' + email + '</td></tr>'
      + '<tr><td style="padding:10px;font-weight:bold;">Mobile</td><td style="padding:10px;">' + mobile + '</td></tr>'
      + '<tr style="background:#f5f7fb;"><td style="padding:10px;font-weight:bold;">Submitted At</td><td style="padding:10px;">' + submittedAt + '</td></tr>'
      + '<tr><td style="padding:10px;font-weight:bold;vertical-align:top;">Description</td><td style="padding:10px;">' + description + '</td></tr>'
      + '</table>'
      + '<p style="margin-top:20px;color:#888;font-size:13px;">Please resolve this complaint at the earliest. - Horizon Bank System</p>'
      + '</div></div>';

    // ── User confirmation email HTML ──────────────────────────
    const userHtml = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">'
      + '<div style="background:#002970;padding:20px 30px;">'
      + '<h2 style="color:white;margin:0;">Horizon Bank</h2>'
      + '</div>'
      + '<div style="padding:25px 30px;">'
      + '<p>Dear <strong>' + fullName + '</strong>,</p>'
      + '<p>Thank you for contacting Horizon Bank. We have received your complaint and our team will look into it shortly.</p>'
      + '<div style="background:#f5f7fb;border-radius:8px;padding:15px 20px;margin:20px 0;">'
      + '<p style="margin:5px 0;"><strong>Complaint ID:</strong> ' + complaintId + '</p>'
      + '<p style="margin:5px 0;"><strong>Type:</strong> ' + complaintType + '</p>'
      + '<p style="margin:5px 0;"><strong>Submitted At:</strong> ' + submittedAt + '</p>'
      + '</div>'
      + '<p>Please keep your Complaint ID for future reference. Our support team will contact you within <strong>24-48 hours</strong>.</p>'
      + '<p style="margin-top:30px;color:#888;font-size:13px;">This is an automated message. Please do not reply to this email.<br>- Horizon Bank Customer Support</p>'
      + '</div></div>';

    // ── Email to ADMIN ────────────────────────────────────────
    const adminMailOptions = {
      from:    process.env.SENDER_EMAIL,
      to:      adminEmail,
      subject: '[Horizon Bank] New Complaint - ' + complaintType + ' | ' + complaintId,
      html:    adminHtml,
    };

    // ── Confirmation email to USER ────────────────────────────
    const userMailOptions = {
      from:    process.env.SENDER_EMAIL,
      to:      email,
      subject: 'Your Complaint Has Been Received - ' + complaintId,
      html:    userHtml,
    };

    // ── Send both emails ──────────────────────────────────────
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    console.log('✅ Complaint email sent — ID: ' + complaintId);
    console.log('📧 Admin notified at: ' + adminEmail);

    res.status(200).json({
      success:     true,
      message:     'Complaint submitted successfully! A confirmation has been sent to your email.',
      complaintId: complaintId,
      submittedAt: submittedAt,
    });

  } catch (err) {
    console.log('COMPLAINT ERROR:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Could not submit complaint.',
      error:   err.message,
    });
  }
};

module.exports = { submitComplaint };