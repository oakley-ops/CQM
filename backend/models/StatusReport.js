const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StatusReport = sequelize.define('StatusReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  report_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  reporting_period: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  overall_status: {
    type: DataTypes.STRING(50),
    defaultValue: 'on-track',
    validate: {
      isIn: {
        args: [['on-track', 'at-risk', 'off-track']],
        msg: 'Invalid status'
      }
    }
  },
  accomplishments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  planned_activities: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  issues: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  risks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  budget_status: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  schedule_status: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'status_reports',
  timestamps: true,
  underscored: true
});

module.exports = StatusReport;
