const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WBSItem = sequelize.define('WBSItem', {
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
  wbs_code: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'wbs_items',
      key: 'id'
    }
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  deliverable: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  estimated_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in days'
  }
}, {
  tableName: 'wbs_items',
  timestamps: true,
  underscored: true
});

module.exports = WBSItem;
