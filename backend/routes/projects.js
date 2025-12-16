const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/projectController');

const router = express.Router();

// Validation rules
const projectValidation = [
  body('name').notEmpty().withMessage('Project name is required'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date')
];

// Routes
router
  .route('/')
  .get(protect, getProjects)
  .post(
    protect,
    authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER),
    projectValidation,
    validate,
    createProject
  );

router
  .route('/:id')
  .get(protect, getProject)
  .put(
    protect,
    authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER),
    updateProject
  )
  .delete(
    protect,
    authorize(ROLES.ADMIN),
    deleteProject
  );

module.exports = router;
