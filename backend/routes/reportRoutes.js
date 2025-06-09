const express = require('express');
const router = express.Router();
const { getReportData } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/reports - Generate productivity report
router.get('/', protect, getReportData);

module.exports = router; 