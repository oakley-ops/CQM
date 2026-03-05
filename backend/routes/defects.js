const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getDefects,
  getDefect,
  getDefectsSummary,
  createDefect,
  updateDefect,
  deleteDefect,
  assignDefect,
  resolveDefect,
  closeDefect
} = require('../controllers/defectController');

// Project-specific routes
router.route('/')
  .get(protect, getDefects)
  .post(protect, createDefect);

router.get('/summary', protect, getDefectsSummary);

// Global routes (single defect operations)
router.route('/:id')
  .get(protect, getDefect)
  .put(protect, updateDefect)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), deleteDefect);

// Workflow routes
router.put('/:id/assign', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD), assignDefect);
router.put('/:id/resolve', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_LEAD), resolveDefect);
router.put('/:id/close', protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), closeDefect);

module.exports = router;
