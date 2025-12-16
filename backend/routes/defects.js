const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
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
  .delete(protect, deleteDefect);

// Workflow routes
router.put('/:id/assign', protect, assignDefect);
router.put('/:id/resolve', protect, resolveDefect);
router.put('/:id/close', protect, closeDefect);

module.exports = router;
