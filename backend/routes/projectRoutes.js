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
  
  try {
    // Get projects where user is a member
    const memberProjects = await ProfessionalProject.findAll({
      include: [{
        model: ProjectMember,
        as: 'ProjectMembers',
        where: { 
          userId: userId,
          status: 'accepted'
        },
        required: true
      }],
      attributes: ['id', 'title', 'creatorId']
    });

    // Get projects where user is the creator
    const creatorProjects = await ProfessionalProject.findAll({
      where: { creatorId: userId },
      attributes: ['id', 'title', 'creatorId']
    });

    // Combine and deduplicate
    const allProjects = [...memberProjects, ...creatorProjects];
    const uniqueProjects = allProjects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );

    console.log('Found team projects:', uniqueProjects.map(p => p.toJSON()));
    res.json(uniqueProjects.map(p => ({ id: p.id, name: p.title })));
  } catch (error) {
    console.error('Error fetching team projects:', error);
    res.status(500).json({ error: 'Failed to fetch team projects' });
  }
});

module.exports = router; 