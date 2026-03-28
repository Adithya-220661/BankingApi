const jwt = require('jsonwebtoken');

// ── type: 'user' | 'admin' ────────────────────────────────────
const generateToken = (id, type = 'user') => {
  return jwt.sign(
    { id, type },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = generateToken;