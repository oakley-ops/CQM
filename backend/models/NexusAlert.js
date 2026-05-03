const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusAlert = sequelize.define('NexusAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER },
  alert_type: { type: DataTypes.STRING(50), allowNull: false },
  severity: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['critical', 'high', 'medium', 'low']] },
  },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  action_required: { type: DataTypes.TEXT },
  requirement_id: { type: DataTypes.STRING(10) },
  entity_type: { type: DataTypes.STRING(50) },
  entity_id: { type: DataTypes.INTEGER },
  is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_dismissed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'nexus_alerts',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = NexusAlert;
