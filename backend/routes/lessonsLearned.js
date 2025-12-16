const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getLessonsLearned,
  getLessonLearned,
  createLessonLearned,
  updateLessonLearned,
  deleteLessonLearned,
  searchLessonsLearned
} = require('../controllers/lessonLearnedController');

const router = express.Router({ mergeParams: true });

// Search route (must be before /:id)
router.get('/search', protect, searchLessonsLearned);

// Project-specific routes
router
  .route('/')
  .get(protect, getLessonsLearned)
  .post(protect, createLessonLearned);

// Individual lesson routes
router
  .route('/:id')
  .get(protect, getLessonLearned)
  .put(protect, updateLessonLearned)
  .delete(protect, authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER), deleteLessonLearned);

module.exports = router;
