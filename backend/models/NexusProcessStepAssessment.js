const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CONFORMITY_VALUES = [
  'NC+', 'nc-', 'RI', 'Full', 'NCC', 'tbd', 'n/a',
  'NC+ (Subcontractor)', 'nc- (Subcontractor)', 'RI (Subcontractor)',
  'Full (Subcontractor)', 'NCC (Subcontractor)',
  'Not assessed (timing constraints)', 'Not assessed (Subcontractor)',
];

const NexusProcessStepAssessment = sequelize.define('NexusProcessStepAssessment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_scope_id: { type: DataTypes.INTEGER, allowNull: false },
  process_tag: { type: DataTypes.STRING(20), allowNull: false },
  process_name: { type: DataTypes.TEXT, allowNull: false },
  vendor_compliance: {
    type: DataTypes.STRING(30),
    validate: { isIn: [['Yes', 'Procedure only', 'Practice only', 'No', 'tbd', 'n/a', 'Not applicable']] },
  },
  vendor_site: { type: DataTypes.STRING(255) },
  vendor_process_spec_ref: { type: DataTypes.TEXT },
  vendor_control_plan_ref: { type: DataTypes.TEXT },
  production_equipment: { type: DataTypes.TEXT },
  test_equipment: { type: DataTypes.TEXT },
  conformity: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'tbd',
    validate: { isIn: [CONFORMITY_VALUES] },
  },
  auditor_notes: { type: DataTypes.TEXT },
}, {
  tableName: 'nexus_process_step_assessments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusProcessStepAssessment;
