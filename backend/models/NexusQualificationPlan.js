const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusQualificationPlan = sequelize.define('NexusQualificationPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER },
  product_scope_id: { type: DataTypes.INTEGER },
  job_id: { type: DataTypes.INTEGER },
  plan_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'product',
    validate: { isIn: [['product', 'process']] },
  },
  version: { type: DataTypes.STRING(20), defaultValue: '1.0' },
  owner: { type: DataTypes.STRING(255) },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [['draft', 'in-progress', 'submitted', 'approved', 'rejected']] },
  },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'nexus_qualification_plans',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusQualificationPlan;
