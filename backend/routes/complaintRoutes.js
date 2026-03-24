const express = require('express');
const router  = express.Router();

const { submitComplaint } = require('../controllers/complaintController');

// ── POST /api/complaints/submit ───────────────────────────────
router.post('/submit', submitComplaint);

module.exports = router;