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
  getProjectStats,
  getProjectComments,
  addProjectComment,
  editProjectComment,
  deleteProjectComment
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

router.route('/:id/comments')
  .get(getProjectComments)
  .post(addProjectComment);

router.route('/:id/comments/:commentId')
  .put(editProjectComment)
  .delete(deleteProjectComment);

module.exports = router;