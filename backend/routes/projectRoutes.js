const express = require('express');
const router = express.Router();
const { protect: authenticate } = require('../middleware/authMiddleware');

// GET /api/projects - All projects the user can see
router.get('/', authenticate, async (req, res) => {
  // TODO: Replace with real DB query
  res.json([
    { id: 1, name: 'Project Alpha' },
    { id: 2, name: 'Project Beta' }
  ]);
});

// GET /api/projects/personal - User's personal projects from DB
router.get('/personal', authenticate, async (req, res) => {
  const { PersonalProject } = require('../models');
  console.log('Fetching personal projects for user:', req.user.id);
  const projects = await PersonalProject.findAll({
    where: { userId: req.user.id },
    attributes: ['id', 'title']
  });
  console.log('Found personal projects:', projects.map(p => p.toJSON()));
  res.json(projects.map(p => ({ id: p.id, name: p.title })));
});

// GET /api/projects/team - User's professional projects from DB
router.get('/team', authenticate, async (req, res) => {
  const { ProfessionalProject, ProjectMember } = require('../models');
  const userId = req.user.id;
  console.log('Fetching team projects for user:', userId);
  const projects = await ProfessionalProject.findAll({
    include: [{
      model: ProjectMember,
      as: 'ProjectMembers',
      where: { userId },
      required: false
    }],
    attributes: ['id', 'title', 'creatorId']
  });
  // Filter: user is creator or a member
  const filtered = projects.filter(
    p => Number(p.creatorId) === Number(userId) || (p.ProjectMembers && p.ProjectMembers.length > 0)
  );
  console.log('Found team projects:', filtered.map(p => p.toJSON()));
  res.json(filtered.map(p => ({ id: p.id, name: p.title })));
});

module.exports = router; 