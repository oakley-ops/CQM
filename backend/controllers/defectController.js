const { Defect, Project, User, QualityInspection } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// @desc    Get all defects for a project
// @route   GET /api/projects/:id/defects
// @access  Private
const getDefects = async (req, res, next) => {
  try {
    const defects = await Defect.findAll({
      where: { project_id: req.params.id },
      include: [
        {
          model: User,
          as: 'detectedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: QualityInspection,
          as: 'inspection',
          attributes: ['id', 'inspection_name', 'inspection_date']
        }
      ],
      order: [['detected_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: defects.length,
      data: defects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single defect
// @route   GET /api/defects/:id
// @access  Private
const getDefect = async (req, res, next) => {
  try {
    const defect = await Defect.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'detectedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: QualityInspection,
          as: 'inspection',
          attributes: ['id', 'inspection_name', 'inspection_date']
        }
      ]
    });

    if (!defect) {
      return next(new AppError('Defect not found', 404));
    }

    res.status(200).json({
      success: true,
      data: defect
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get defects summary
// @route   GET /api/projects/:id/defects/summary
// @access  Private
const getDefectsSummary = async (req, res, next) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_defects,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_count
      FROM defects
      WHERE project_id = :projectId
    `, {
      replacements: { projectId: req.params.id }
    });

    res.status(200).json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create defect
// @route   POST /api/projects/:id/defects
// @access  Private
const createDefect = async (req, res, next) => {
  try {
    const defect = await Defect.create({
      project_id: req.params.id,
      detected_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: defect
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update defect
// @route   PUT /api/defects/:id
// @access  Private
const updateDefect = async (req, res, next) => {
  try {
    const defect = await Defect.findByPk(req.params.id);

    if (!defect) {
      return next(new AppError('Defect not found', 404));
    }

    await defect.update(req.body);

    res.status(200).json({
      success: true,
      data: defect
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete defect
// @route   DELETE /api/defects/:id
// @access  Private
const deleteDefect = async (req, res, next) => {
  try {
    const defect = await Defect.findByPk(req.params.id);

    if (!defect) {
      return next(new AppError('Defect not found', 404));
    }

    await defect.destroy();

    res.status(200).json({
      success: true,
      message: 'Defect deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign defect
// @route   PUT /api/defects/:id/assign
// @access  Private
const assignDefect = async (req, res, next) => {
  try {
    const defect = await Defect.findByPk(req.params.id);

    if (!defect) {
      return next(new AppError('Defect not found', 404));
    }

    const { assigned_to } = req.body;

    if (!assigned_to) {
      return next(new AppError('Please provide user ID to assign', 400));
    }

    await defect.update({
      assigned_to,
      status: defect.status === 'open' ? 'in-progress' : defect.status
    });

    res.status(200).json({
      success: true,
      data: defect
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve defect
// @route   PUT /api/defects/:id/resolve
// @access  Private
const resolveDefect = async (req, res, next) => {
  try {
    const defect = await Defect.findByPk(req.params.id);

    if (!defect) {
      return next(new AppError('Defect not found', 404));
    }

    if (defect.status === 'closed') {
      return next(new AppError('Cannot resolve a closed defect', 400));
    }

    const { resolution } = req.body;

    await defect.update({
      status: 'resolved',
      resolved_date: new Date(),
      resolution
    });

    res.status(200).json({
      success: true,
      data: defect
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close defect
// @route   PUT /api/defects/:id/close
// @access  Private
const closeDefect = async (req, res, next) => {
  try {
    const defect = await Defect.findByPk(req.params.id);

    if (!defect) {
      return next(new AppError('Defect not found', 404));
    }

    if (defect.status !== 'resolved') {
      return next(new AppError('Only resolved defects can be closed', 400));
    }

    await defect.update({
      status: 'closed'
    });

    res.status(200).json({
      success: true,
      data: defect
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDefects,
  getDefect,
  getDefectsSummary,
  createDefect,
  updateDefect,
  deleteDefect,
  assignDefect,
  resolveDefect,
  closeDefect
};
