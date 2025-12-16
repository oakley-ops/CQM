const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskDependency = sequelize.define('TaskDependency', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  depends_on_task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  dependency_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'finish_to_start',
    validate: {
      isIn: {
        args: [['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']],
        msg: 'Invalid dependency type'
      }
    }
  },
  lag_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'task_dependencies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true
});

module.exports = TaskDependency;
