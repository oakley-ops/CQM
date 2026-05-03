const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusCapaItem = sequelize.define('NexusCapaItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  action_id: { type: DataTypes.STRING(20), unique: true },
  requirement_id: { type: DataTypes.STRING(10) },
  source_type: {
    type: DataTypes.STRING(30),
    defaultValue: 'qms',
    validate: { isIn: [['qms', 'process-step', 'manual']] },
  },
  source_entity_id: { type: DataTypes.INTEGER },
  severity: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['NC+', 'nc-', 'RI']] },
  },
  observation: { type: DataTypes.TEXT },
  suggested_action: { type: DataTypes.TEXT },
  deadline: { type: DataTypes.DATEONLY },
  corrective_action: { type: DataTypes.TEXT },
  target_date: { type: DataTypes.DATEONLY },
  responsibility: { type: DataTypes.STRING(255) },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Not yet started',
    validate: {
      isIn: [[
        'Not yet started', 'Ongoing', 'Complete', 'Cancelled',
        'Finding Rejected', 'Completed check next audit', 'Replaced by new Action',
      ]],
    },
  },
  status_description: { type: DataTypes.TEXT },
  evidence_ref: { type: DataTypes.TEXT },
  auditor_review_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'Open',
    validate: { isIn: [['Open', 'Completed', 'Cancelled']] },
  },
  auditor_comment: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'nexus_capa_items',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusCapaItem;
