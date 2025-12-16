const { LessonLearned, Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Get all lessons learned for a project
// @route   GET /api/projects/:id/lessons-learned
// @access  Private
const getLessonsLearned = async (req, res, next) => {
  try {
    const { category, phase, impact } = req.query;
    const where = { project_id: req.params.id };

    if (category) where.category = category;
    if (phase) where.phase = phase;
    if (impact) where.impact = impact;

    const lessons = await LessonLearned.findAll({
      where,
      include: [
        {
          model: User,
          as: 'documenter',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lesson learned
// @route   GET /api/lessons-learned/:id
// @access  Private
const getLessonLearned = async (req, res, next) => {
  try {
    const lesson = await LessonLearned.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'documenter',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!lesson) {
      return next(new AppError('Lesson learned not found', 404));
    }

    res.status(200).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lesson learned
// @route   POST /api/projects/:id/lessons-learned
// @access  Private
const createLessonLearned = async (req, res, next) => {
  try {
    const lesson = await LessonLearned.create({
      project_id: req.params.id,
      documented_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lesson learned
// @route   PUT /api/lessons-learned/:id
// @access  Private
const updateLessonLearned = async (req, res, next) => {
  try {
    const lesson = await LessonLearned.findByPk(req.params.id);

    if (!lesson) {
      return next(new AppError('Lesson learned not found', 404));
    }

    await lesson.update(req.body);

    res.status(200).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete lesson learned
// @route   DELETE /api/lessons-learned/:id
// @access  Private
const deleteLessonLearned = async (req, res, next) => {
  try {
    const lesson = await LessonLearned.findByPk(req.params.id);

    if (!lesson) {
      return next(new AppError('Lesson learned not found', 404));
    }

    await lesson.destroy();

    res.status(200).json({
      success: true,
      message: 'Lesson learned deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search lessons learned across all projects
// @route   GET /api/lessons-learned/search
// @access  Private
const searchLessonsLearned = async (req, res, next) => {
  try {
    const { q, category, phase, impact } = req.query;
    const where = {};

    if (q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { recommendations: { [Op.iLike]: `%${q}%` } }
      ];
    }

    if (category) where.category = category;
    if (phase) where.phase = phase;
    if (impact) where.impact = impact;

    const lessons = await LessonLearned.findAll({
      where,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'documenter',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.status(200).json({
      success: true,
      count: lessons.length,
      data: lessons
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLessonsLearned,
  getLessonLearned,
  createLessonLearned,
  updateLessonLearned,
  deleteLessonLearned,
  searchLessonsLearned
};
