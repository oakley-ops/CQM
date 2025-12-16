const { ProjectCharter, Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get project charter
// @route   GET /api/projects/:id/charter
// @access  Private
const getCharter = async (req, res, next) => {
  try {
    const charter = await ProjectCharter.findOne({
      where: { project_id: req.params.id },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!charter) {
      return next(new AppError('Charter not found for this project', 404));
    }

    res.status(200).json({
      success: true,
      data: charter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create project charter
// @route   POST /api/projects/:id/charter
// @access  Private
const createCharter = async (req, res, next) => {
  try {
    // Check if charter already exists
    const existingCharter = await ProjectCharter.findOne({
      where: { project_id: req.params.id }
    });

    if (existingCharter) {
      return next(new AppError('Charter already exists for this project', 400));
    }

    const charter = await ProjectCharter.create({
      project_id: req.params.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: charter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project charter
// @route   PUT /api/projects/:id/charter
// @access  Private
const updateCharter = async (req, res, next) => {
  try {
    const charter = await ProjectCharter.findOne({
      where: { project_id: req.params.id }
    });

    if (!charter) {
      return next(new AppError('Charter not found', 404));
    }

    await charter.update(req.body);

    res.status(200).json({
      success: true,
      data: charter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve project charter
// @route   PUT /api/projects/:id/charter/approve
// @access  Private (Admin, PM)
const approveCharter = async (req, res, next) => {
  try {
    const charter = await ProjectCharter.findOne({
      where: { project_id: req.params.id }
    });

    if (!charter) {
      return next(new AppError('Charter not found', 404));
    }

    await charter.update({
      approved_by: req.user.id,
      approved_at: new Date()
    });

    res.status(200).json({
      success: true,
      data: charter,
      message: 'Charter approved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project charter
// @route   DELETE /api/projects/:id/charter
// @access  Private (Admin)
const deleteCharter = async (req, res, next) => {
  try {
    const charter = await ProjectCharter.findOne({
      where: { project_id: req.params.id }
    });

    if (!charter) {
      return next(new AppError('Charter not found', 404));
    }

    await charter.destroy();

    res.status(200).json({
      success: true,
      message: 'Charter deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCharter,
  createCharter,
  updateCharter,
  approveCharter,
  deleteCharter
};
