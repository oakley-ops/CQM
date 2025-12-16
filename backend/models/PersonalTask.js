const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PersonalTask = sequelize.define('PersonalTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  task_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'todo',
    validate: {
      isIn: [['todo', 'weekly_priority', 'weekly_plan', '30_day', '60_day', 'training', 'event']]
    }
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'Medium',
    validate: {
      isIn: [['Critical', 'High', 'Medium', 'Low']]
    }
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'Not Started',
    validate: {
      isIn: [['Not Started', 'In Progress', 'Completed', 'Cancelled']]
    }
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurrence_pattern: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['daily', 'weekly', 'monthly', null]]
    }
  },
  sequence_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  tableName: 'personal_tasks',
  timestamps: true,
  underscored: true
});

module.exports = PersonalTask;
