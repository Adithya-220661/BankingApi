const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8','8.8.4.4']);

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');

dotenv.config();

const authRoutes        = require('./routes/authRoutes');
const accountRoutes     = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const adminAuthRoutes   = require('./routes/adminAuth');
const auditRoutes       = require('./routes/audit');

const app = express();

// ⭐ PROFESSIONAL CORS CONFIG (Frontend Live Server Support)
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501"
  ],
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json());

// ── Customer routes ───────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/account',      accountRoutes);
app.use('/api/transactions', transactionRoutes);

// ── Admin routes ──────────────────────────────────────────────
app.use('/api/admin',        adminRoutes);
app.use('/api/admin-auth',   adminAuthRoutes);
app.use('/api/audit',        auditRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🏦 Horizon Bank API is running' });
});

// ⭐ GLOBAL ERROR HANDLER (INDUSTRY LEVEL)
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log('🌐 Frontend Origins Allowed (Live Server)');
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });