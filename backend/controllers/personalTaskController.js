const { PersonalTask, User } = require('../models');
const { Op } = require('sequelize');

// Get all personal tasks for the logged-in user
exports.getPersonalTasks = async (req, res) => {
  try {
    const { task_type, status, start_date, end_date } = req.query;
    const userId = req.user.id;

    const where = { user_id: userId };

    if (task_type) {
      where.task_type = task_type;
    }

    if (status) {
      where.status = status;
    }

    if (start_date && end_date) {
      where.due_date = {
        [Op.between]: [start_date, end_date]
      };
    } else if (start_date) {
      where.due_date = {
        [Op.gte]: start_date
      };
    } else if (end_date) {
      where.due_date = {
        [Op.lte]: end_date
      };
    }

    const tasks = await PersonalTask.findAll({
      where,
      order: [
        ['sequence_order', 'ASC'],
        ['due_date', 'ASC'],
        ['created_at', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching personal tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching personal tasks',
      error: error.message
    });
  }
};

// Get task by ID
exports.getPersonalTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await PersonalTask.findOne({
      where: { id, user_id: userId }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
};

// Create personal task
exports.createPersonalTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskData = {
      ...req.body,
      user_id: userId
    };

    const task = await PersonalTask.create(taskData);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
};

// Update personal task
exports.updatePersonalTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await PersonalTask.findOne({
      where: { id, user_id: userId }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // If marking as completed, set completed_date
    if (req.body.status === 'Completed' && task.status !== 'Completed') {
      req.body.completed_date = new Date();
    }

    await task.update(req.body);

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
};

// Delete personal task
exports.deletePersonalTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await PersonalTask.findOne({
      where: { id, user_id: userId }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.destroy();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
};

// Reorder tasks
exports.reorderTasks = async (req, res) => {
  try {
    const { tasks } = req.body;
    const userId = req.user.id;

    // Update sequence order for each task
    for (const taskUpdate of tasks) {
      await PersonalTask.update(
        { sequence_order: taskUpdate.sequence_order },
        { 
          where: { 
            id: taskUpdate.id,
            user_id: userId
          }
        }
      );
    }

    res.json({
      success: true,
      message: 'Tasks reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error reordering tasks',
      error: error.message
    });
  }
};

// Get task statistics
exports.getTaskStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalTasks = await PersonalTask.count({
      where: { user_id: userId }
    });

    const completedTasks = await PersonalTask.count({
      where: { 
        user_id: userId,
        status: 'Completed'
      }
    });

    const inProgressTasks = await PersonalTask.count({
      where: { 
        user_id: userId,
        status: 'In Progress'
      }
    });

    const overdueTasks = await PersonalTask.count({
      where: { 
        user_id: userId,
        status: { [Op.ne]: 'Completed' },
        due_date: { [Op.lt]: new Date() }
      }
    });

    const todayTasks = await PersonalTask.count({
      where: { 
        user_id: userId,
        status: { [Op.ne]: 'Completed' },
        due_date: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        todayTasks
      }
    });
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task statistics',
      error: error.message
    });
  }
};
