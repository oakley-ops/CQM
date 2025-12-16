const { ChangeRequest, Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all change requests for a project
// @route   GET /api/projects/:id/change-requests
// @access  Private
const getChangeRequests = async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const where = { project_id: req.params.id };

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const changeRequests = await ChangeRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: changeRequests.length,
      data: changeRequests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single change request
// @route   GET /api/change-requests/:id
// @access  Private
const getChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    res.status(200).json({
      success: true,
      data: changeRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create change request
// @route   POST /api/projects/:id/change-requests
// @access  Private
const createChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.create({
      project_id: req.params.id,
      requested_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: changeRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update change request
// @route   PUT /api/change-requests/:id
// @access  Private
const updateChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    await changeRequest.update(req.body);

    res.status(200).json({
      success: true,
      data: changeRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review change request
// @route   PUT /api/change-requests/:id/review
// @access  Private (PM, Admin)
const reviewChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    await changeRequest.update({
      status: 'under_review',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      review_notes: req.body.review_notes
    });

    res.status(200).json({
      success: true,
      data: changeRequest,
      message: 'Change request reviewed'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve change request
// @route   PUT /api/change-requests/:id/approve
// @access  Private (PM, Admin)
const approveChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    await changeRequest.update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date(),
      approval_notes: req.body.approval_notes
    });

    res.status(200).json({
      success: true,
      data: changeRequest,
      message: 'Change request approved'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject change request
// @route   PUT /api/change-requests/:id/reject
// @access  Private (PM, Admin)
const rejectChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    await changeRequest.update({
      status: 'rejected',
      reviewed_by: req.user.id,
      reviewed_at: new Date(),
      review_notes: req.body.review_notes
    });

    res.status(200).json({
      success: true,
      data: changeRequest,
      message: 'Change request rejected'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark change request as implemented
// @route   PUT /api/change-requests/:id/implement
// @access  Private (PM, Admin)
const implementChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    if (changeRequest.status !== 'approved') {
      return next(new AppError('Only approved change requests can be implemented', 400));
    }

    await changeRequest.update({
      status: 'implemented',
      implemented_at: new Date(),
      implementation_notes: req.body.implementation_notes
    });

    res.status(200).json({
      success: true,
      data: changeRequest,
      message: 'Change request marked as implemented'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete change request
// @route   DELETE /api/change-requests/:id
// @access  Private (Admin)
const deleteChangeRequest = async (req, res, next) => {
  try {
    const changeRequest = await ChangeRequest.findByPk(req.params.id);

    if (!changeRequest) {
      return next(new AppError('Change request not found', 404));
    }

    await changeRequest.destroy();

    res.status(200).json({
      success: true,
      message: 'Change request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChangeRequests,
  getChangeRequest,
  createChangeRequest,
  updateChangeRequest,
  reviewChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  implementChangeRequest,
  deleteChangeRequest
};
