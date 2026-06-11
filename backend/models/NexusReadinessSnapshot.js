const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusReadinessSnapshot = sequelize.define('NexusReadinessSnapshot', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  payload: { type: DataTypes.JSONB, allowNull: false },
}, {
  tableName: 'nexus_readiness_snapshots',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = NexusReadinessSnapshot;
