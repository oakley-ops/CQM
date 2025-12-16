const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuoteMilestone = sequelize.define('QuoteMilestone', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sequence_order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  target_duration_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quote_milestones',
  timestamps: false
});

module.exports = QuoteMilestone;
