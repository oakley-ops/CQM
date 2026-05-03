const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CONFORMITY_VALUES = [
  'NC+', 'nc-', 'RI', 'Full', 'NCC', 'tbd', 'n/a',
  'NC+ (Subcontractor)', 'nc- (Subcontractor)', 'RI (Subcontractor)',
  'Full (Subcontractor)', 'NCC (Subcontractor)',
  'Not assessed (timing constraints)', 'Not assessed (Subcontractor)',
];

const NexusQmsAssessment = sequelize.define('NexusQmsAssessment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  requirement_id: { type: DataTypes.STRING(10), allowNull: false },
  section: { type: DataTypes.STRING(30) },
  title: { type: DataTypes.TEXT, allowNull: false },
  iso_9001_coverage: { type: DataTypes.STRING(50) },
  vendor_compliance: {
    type: DataTypes.STRING(30),
    defaultValue: 'tbd',
    validate: { isIn: [['Yes', 'Procedure only', 'Practice only', 'No', 'tbd', 'n/a']] },
  },
  vendor_evidence_ref: { type: DataTypes.TEXT },
  conformity: {
    type: DataTypes.STRING(50),
    defaultValue: 'tbd',
    validate: { isIn: [CONFORMITY_VALUES] },
  },
  auditor_comment: { type: DataTypes.TEXT },
}, {
  tableName: 'nexus_qms_assessments',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusQmsAssessment;
