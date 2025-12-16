const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectCharter = sequelize.define('ProjectCharter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  business_case: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  objectives: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  success_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  high_level_requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assumptions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  constraints: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  high_level_risks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  summary_budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  summary_timeline: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  key_stakeholders: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approval_requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'project_charters',
  timestamps: true
});

module.exports = ProjectCharter;
