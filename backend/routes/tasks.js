const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskProgress,
  deleteTask,
  getGanttData,
  addDependency,
  removeDependency
} = require('../controllers/taskController');

const router = express.Router({ mergeParams: true });

// Project-specific routes
router
  .route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.get('/gantt', protect, getGanttData);

// Individual task routes
router
  .route('/:id')
  .get(protect, getTask)
  .put(protect, updateTask)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), deleteTask);

router.put('/:id/progress', protect, updateTaskProgress);
router.post('/:id/dependencies', protect, addDependency);

module.exports = router;
