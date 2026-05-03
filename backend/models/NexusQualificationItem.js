const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusQualificationItem = sequelize.define('NexusQualificationItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  requirement_id: { type: DataTypes.STRING(10) },
  section: { type: DataTypes.STRING(30) },
  title: { type: DataTypes.TEXT, allowNull: false },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'in-progress', 'complete', 'not-applicable']] },
  },
  evidence_type: { type: DataTypes.STRING(50) },
  evidence_ref: { type: DataTypes.TEXT },
  responsible: { type: DataTypes.STRING(255) },
  target_date: { type: DataTypes.DATEONLY },
  completed_date: { type: DataTypes.DATEONLY },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'nexus_qualification_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusQualificationItem;
