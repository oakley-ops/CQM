const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Requirement = sequelize.define('Requirement', {
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
  requirement_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [['functional', 'non-functional', 'business', 'technical', 'regulatory']],
        msg: 'Invalid category'
      }
    }
  },
  priority: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['low', 'medium', 'high', 'critical']],
        msg: 'Invalid priority'
      }
    }
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'draft',
    validate: {
      isIn: {
        args: [['draft', 'approved', 'implemented', 'verified', 'rejected']],
        msg: 'Invalid status'
      }
    }
  },
  source: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  acceptance_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'requirements',
  timestamps: true,
  underscored: true
});

module.exports = Requirement;
