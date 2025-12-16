const { Milestone, Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all milestones for a project
// @route   GET /api/projects/:id/milestones
// @access  Private
const getMilestones = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { project_id: req.params.id };

    if (status) where.status = status;

    const milestones = await Milestone.findAll({
      where,
      order: [['due_date', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: milestones.length,
      data: milestones
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single milestone
// @route   GET /api/milestones/:id
// @access  Private
const getMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!milestone) {
      return next(new AppError('Milestone not found', 404));
    }

    res.status(200).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create milestone
// @route   POST /api/projects/:id/milestones
// @access  Private
const createMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update milestone
// @route   PUT /api/milestones/:id
// @access  Private
const updateMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id);

    if (!milestone) {
      return next(new AppError('Milestone not found', 404));
    }

    await milestone.update(req.body);

    res.status(200).json({
      success: true,
      data: milestone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark milestone as complete
// @route   PUT /api/milestones/:id/complete
// @access  Private
const completeMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id);

    if (!milestone) {
      return next(new AppError('Milestone not found', 404));
    }

    await milestone.update({
      status: 'completed',
      completion_date: new Date()
    });

    res.status(200).json({
      success: true,
      data: milestone,
      message: 'Milestone marked as complete'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete milestone
// @route   DELETE /api/milestones/:id
// @access  Private
const deleteMilestone = async (req, res, next) => {
  try {
    const milestone = await Milestone.findByPk(req.params.id);

    if (!milestone) {
      return next(new AppError('Milestone not found', 404));
    }

    await milestone.destroy();

    res.status(200).json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  completeMilestone,
  deleteMilestone
};
