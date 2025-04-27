const express = require('express');
const router = express.Router();
const {
  getProfessionalProjects,
  getProfessionalProject,
  createProfessionalProject,
  updateProfessionalProject,
  deleteProfessionalProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats
} = require('../controllers/professionalProjectController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getProfessionalProjects)
  .post(createProfessionalProject);

router.route('/:id')
  .get(getProfessionalProject)
  .put(updateProfessionalProject)
  .delete(deleteProfessionalProject);

router.route('/:id/members')
  .post(addProjectMember);

router.route('/:id/members/:userId')
  .delete(removeProjectMember);

router.get('/:id/stats', getProjectStats);

module.exports = router;