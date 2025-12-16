const { QualityInspection, Project, User, Defect } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Get all inspections for a project
// @route   GET /api/projects/:id/inspections
// @access  Private
const getInspections = async (req, res, next) => {
  try {
    const inspections = await QualityInspection.findAll({
      where: { project_id: req.params.id },
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['inspection_date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: inspections.length,
      data: inspections
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single inspection
// @route   GET /api/inspections/:id
// @access  Private
const getInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Defect,
          as: 'defects'
        }
      ]
    });

    if (!inspection) {
      return next(new AppError('Inspection not found', 404));
    }

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create inspection
// @route   POST /api/projects/:id/inspections
// @access  Private
const createInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.create({
      project_id: req.params.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update inspection
// @route   PUT /api/inspections/:id
// @access  Private
const updateInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);

    if (!inspection) {
      return next(new AppError('Inspection not found', 404));
    }

    await inspection.update(req.body);

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete inspection
// @route   DELETE /api/inspections/:id
// @access  Private
const deleteInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);

    if (!inspection) {
      return next(new AppError('Inspection not found', 404));
    }

    await inspection.destroy();

    res.status(200).json({
      success: true,
      message: 'Inspection deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete inspection
// @route   PUT /api/inspections/:id/complete
// @access  Private
const completeInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);

    if (!inspection) {
      return next(new AppError('Inspection not found', 404));
    }

    if (inspection.status === 'completed' || inspection.status === 'approved') {
      return next(new AppError('Inspection is already completed', 400));
    }

    await inspection.update({
      status: 'completed',
      ...req.body
    });

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve inspection
// @route   PUT /api/inspections/:id/approve
// @access  Private
const approveInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);

    if (!inspection) {
      return next(new AppError('Inspection not found', 404));
    }

    if (inspection.status !== 'completed') {
      return next(new AppError('Only completed inspections can be approved', 400));
    }

    await inspection.update({
      status: 'approved'
    });

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject inspection
// @route   PUT /api/inspections/:id/reject
// @access  Private
const rejectInspection = async (req, res, next) => {
  try {
    const inspection = await QualityInspection.findByPk(req.params.id);

    if (!inspection) {
      return next(new AppError('Inspection not found', 404));
    }

    if (inspection.status !== 'completed') {
      return next(new AppError('Only completed inspections can be rejected', 400));
    }

    await inspection.update({
      status: 'rejected',
      ...req.body
    });

    res.status(200).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInspections,
  getInspection,
  createInspection,
  updateInspection,
  deleteInspection,
  completeInspection,
  approveInspection,
  rejectInspection
};
