const { Task, User, Project, TaskDependency } = require('../models');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all tasks for a project
// @route   GET /api/projects/:id/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { status, assigned_to, priority } = req.query;
    const where = { project_id: req.params.id };

    if (status) where.status = status;
    if (assigned_to) where.assigned_to = assigned_to;
    if (priority) where.priority = priority;

    const tasks = await Task.findAll({
      where,
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Task,
          as: 'subtasks',
          attributes: ['id', 'name', 'status', 'progress']
        }
      ],
      order: [['start_date', 'ASC'], ['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Task,
          as: 'parentTask',
          attributes: ['id', 'name']
        },
        {
          model: Task,
          as: 'subtasks'
        }
      ]
    });

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/projects/:id/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const task = await Task.create({
      project_id: req.params.id,
      created_by: req.user.id,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await task.update(req.body);

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task progress
// @route   PUT /api/tasks/:id/progress
// @access  Private
const updateTaskProgress = async (req, res, next) => {
  try {
    const { progress } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await task.update({ 
      progress,
      status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
    });

    res.status(200).json({
      success: true,
      data: task,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await task.destroy();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Gantt chart data
// @route   GET /api/projects/:id/tasks/gantt
// @access  Private
const getGanttData = async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      where: { project_id: req.params.id },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['start_date', 'ASC']]
    });

    // Get dependencies
    const taskIds = tasks.map(t => t.id);
    const dependencies = await TaskDependency.findAll({
      where: { task_id: taskIds }
    });

    res.status(200).json({
      success: true,
      data: {
        tasks,
        dependencies
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add task dependency
// @route   POST /api/tasks/:id/dependencies
// @access  Private
const addDependency = async (req, res, next) => {
  try {
    const { depends_on_task_id, dependency_type, lag_days } = req.body;

    const dependency = await TaskDependency.create({
      task_id: req.params.id,
      depends_on_task_id,
      dependency_type: dependency_type || 'finish_to_start',
      lag_days: lag_days || 0
    });

    res.status(201).json({
      success: true,
      data: dependency
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove task dependency
// @route   DELETE /api/task-dependencies/:id
// @access  Private
const removeDependency = async (req, res, next) => {
  try {
    const dependency = await TaskDependency.findByPk(req.params.id);

    if (!dependency) {
      return next(new AppError('Dependency not found', 404));
    }

    await dependency.destroy();

    res.status(200).json({
      success: true,
      message: 'Dependency removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskProgress,
  deleteTask,
  getGanttData,
  addDependency,
  removeDependency
};
