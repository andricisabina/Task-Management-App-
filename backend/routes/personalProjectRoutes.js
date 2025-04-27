const express = require('express');
const router = express.Router();
const {
  getPersonalProjects,
  getPersonalProject,
  createPersonalProject,
  updatePersonalProject,
  deletePersonalProject,
  getProjectStats
} = require('../controllers/personalProjectController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getPersonalProjects)
  .post(createPersonalProject);

router.route('/:id')
  .get(getPersonalProject)
  .put(updatePersonalProject)
  .delete(deletePersonalProject);

router.get('/:id/stats', getProjectStats);

module.exports = router;