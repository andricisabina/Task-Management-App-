const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// GET /api/projects - All projects the user can see
router.get('/', authenticate, async (req, res) => {
  // TODO: Replace with real DB query
  res.json([
    { id: 1, name: 'Project Alpha' },
    { id: 2, name: 'Project Beta' }
  ]);
});

// GET /api/projects/personal - User's personal projects
router.get('/personal', authenticate, async (req, res) => {
  // TODO: Replace with real DB query for personal projects
  res.json([
    { id: 1, name: 'Personal Project' }
  ]);
});

// GET /api/projects/team - User's team/professional projects
router.get('/team', authenticate, async (req, res) => {
  // TODO: Replace with real DB query for team projects
  res.json([
    { id: 2, name: 'Team Project' }
  ]);
});

module.exports = router; 