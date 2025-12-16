const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuoteMilestoneTracking = sequelize.define('QuoteMilestoneTracking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quote_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quotes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  milestone_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quote_milestones',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Not Started',
    validate: {
      isIn: [['Not Started', 'In Progress', 'Completed', 'Skipped', 'Blocked']]
    }
  },
  started_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expected_completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_duration_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  blockers: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quote_milestone_tracking',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['quote_id', 'milestone_id']
    }
  ]
});

module.exports = QuoteMilestoneTracking;
