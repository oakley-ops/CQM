const { Stakeholder, Project } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all stakeholders for a project
// @route   GET /api/projects/:id/stakeholders
// @access  Private
const getStakeholders = async (req, res, next) => {
  try {
    const stakeholders = await Stakeholder.findAll({
      where: { project_id: req.params.id },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: stakeholders.length,
      data: stakeholders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single stakeholder
// @route   GET /api/stakeholders/:id
// @access  Private
const getStakeholder = async (req, res, next) => {
  try {
    const stakeholder = await Stakeholder.findByPk(req.params.id, {
      include: [{
        model: Project,
        as: 'project',
        attributes: ['id', 'name']
      }]
    });

    if (!stakeholder) {
      return next(new AppError('Stakeholder not found', 404));
    }

    res.status(200).json({
      success: true,
      data: stakeholder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create stakeholder
// @route   POST /api/projects/:id/stakeholders
// @access  Private
const createStakeholder = async (req, res, next) => {
  try {
    const stakeholder = await Stakeholder.create({
      project_id: req.params.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: stakeholder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stakeholder
// @route   PUT /api/stakeholders/:id
// @access  Private
const updateStakeholder = async (req, res, next) => {
  try {
    const stakeholder = await Stakeholder.findByPk(req.params.id);

    if (!stakeholder) {
      return next(new AppError('Stakeholder not found', 404));
    }

    await stakeholder.update(req.body);

    res.status(200).json({
      success: true,
      data: stakeholder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete stakeholder
// @route   DELETE /api/stakeholders/:id
// @access  Private
const deleteStakeholder = async (req, res, next) => {
  try {
    const stakeholder = await Stakeholder.findByPk(req.params.id);

    if (!stakeholder) {
      return next(new AppError('Stakeholder not found', 404));
    }

    await stakeholder.destroy();

    res.status(200).json({
      success: true,
      message: 'Stakeholder deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get stakeholder matrix (power/interest)
// @route   GET /api/projects/:id/stakeholders/matrix
// @access  Private
const getStakeholderMatrix = async (req, res, next) => {
  try {
    const stakeholders = await Stakeholder.findAll({
      where: { project_id: req.params.id }
    });

    // Group by interest and influence levels
    const matrix = {
      high_power_high_interest: [],
      high_power_low_interest: [],
      low_power_high_interest: [],
      low_power_low_interest: []
    };

    stakeholders.forEach(stakeholder => {
      const highPower = ['high', 'very_high'].includes(stakeholder.influence_level);
      const highInterest = ['high', 'very_high'].includes(stakeholder.interest_level);

      if (highPower && highInterest) {
        matrix.high_power_high_interest.push(stakeholder);
      } else if (highPower && !highInterest) {
        matrix.high_power_low_interest.push(stakeholder);
      } else if (!highPower && highInterest) {
        matrix.low_power_high_interest.push(stakeholder);
      } else {
        matrix.low_power_low_interest.push(stakeholder);
      }
    });

    res.status(200).json({
      success: true,
      data: matrix
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStakeholders,
  getStakeholder,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  getStakeholderMatrix
};
