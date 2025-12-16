const { Project, User } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const where = {};
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { count, rows: projects } = await Project.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'projectManager',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'projectManager',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin, Project Manager)
const createProject = async (req, res, next) => {
  try {
    const {
      name,
      description,
      start_date,
      end_date,
      project_manager_id,
      budget
    } = req.body;

    const project = await Project.create({
      name,
      description,
      start_date,
      end_date,
      project_manager_id: project_manager_id || req.user.id,
      budget
    });

    const projectWithManager = await Project.findByPk(project.id, {
      include: [{
        model: User,
        as: 'projectManager',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    res.status(201).json({
      success: true,
      data: projectWithManager
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin, Project Manager)
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    const {
      name,
      description,
      start_date,
      end_date,
      status,
      project_manager_id,
      budget,
      progress
    } = req.body;

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (start_date) project.start_date = start_date;
    if (end_date) project.end_date = end_date;
    if (status) project.status = status;
    if (project_manager_id) project.project_manager_id = project_manager_id;
    if (budget !== undefined) project.budget = budget;
    if (progress !== undefined) project.progress = progress;

    await project.save();

    const updatedProject = await Project.findByPk(project.id, {
      include: [{
        model: User,
        as: 'projectManager',
        attributes: ['id', 'first_name', 'last_name', 'email']
      }]
    });

    res.status(200).json({
      success: true,
      data: updatedProject
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
      return next(new AppError('Project not found', 404));
    }

    await project.destroy();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
};
