// ═══════════════════════════════════════════════════════════════
//  SEED SUPER ADMIN
//  Run once: node backend/utils/seedSuperAdmin.js
//  Creates the Super Admin account in MongoDB
// ═══════════════════════════════════════════════════════════════
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8','8.8.4.4']);

require('dotenv').config({
  path: require('path').join(__dirname, '../.env')
});
const mongoose  = require('mongoose');
const AdminUser = require('../models/AdminUser');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log('✅ MongoDB connected');

    // ── Check if super admin already exists ───────────────────
    const existing = await AdminUser.findOne({ role: 'superadmin' });
    if (existing) {
      console.log(`⚠️  Super Admin already exists: ${existing.adminId}`);
      await mongoose.disconnect();
      return;
    }

    // ── Create Super Admin ────────────────────────────────────
    const superAdmin = await AdminUser.create({
      fullName:   process.env.SUPER_ADMIN_NAME     || 'Super Admin',
      adminId:    process.env.SUPER_ADMIN_ID        || 'superadmin',
      email:      process.env.SUPER_ADMIN_EMAIL     || 'superadmin@horizonbank.com',
      password:   process.env.SUPER_ADMIN_PASSWORD  || 'SuperAdmin@123',
      role:       'superadmin',
      branchCode: 'HQ',
      isActive:   true,
    });

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║      ✅ SUPER ADMIN CREATED!             ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Name:     ${superAdmin.fullName.padEnd(30)}║`);
    console.log(`║  Admin ID: ${superAdmin.adminId.padEnd(30)}║`);
    console.log(`║  Email:    ${superAdmin.email.padEnd(30)}║`);
    console.log(`║  Role:     superadmin                    ║`);
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');
    console.log('');

    await mongoose.disconnect();
    console.log('✅ Done. Disconnected from MongoDB.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
