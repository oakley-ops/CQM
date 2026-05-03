const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusAuditRecord = sequelize.define('NexusAuditRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  site_name: { type: DataTypes.STRING(255), allowNull: false },
  company: { type: DataTypes.STRING(255), allowNull: false },
  address_line1: { type: DataTypes.STRING(255) },
  address_line2: { type: DataTypes.STRING(255) },
  city: { type: DataTypes.STRING(100) },
  state_province: { type: DataTypes.STRING(100) },
  postal_code: { type: DataTypes.STRING(20) },
  country_code: { type: DataTypes.CHAR(2) },
  audit_date_start: { type: DataTypes.DATEONLY },
  audit_date_end: { type: DataTypes.DATEONLY },
  auditor: { type: DataTypes.STRING(255) },
  audit_type: { type: DataTypes.ENUM('on-site', 'remote') },
  audit_scope: { type: DataTypes.ENUM('initial', 'renewal') },
  iso_9001_certified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  grade: { type: DataTypes.CHAR(1), validate: { isIn: [['A', 'B', 'C', 'D']] } },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'draft',
    validate: { isIn: [['draft', 'in-progress', 'submitted', 'closed']] },
  },
  cqmap_version: { type: DataTypes.STRING(20), defaultValue: 'V3.A' },
  next_audit_date: { type: DataTypes.DATEONLY },
  report_date: { type: DataTypes.DATEONLY },
  general_notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'nexus_audit_records',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusAuditRecord;
