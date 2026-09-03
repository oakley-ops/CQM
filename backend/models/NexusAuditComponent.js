const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
// CQM controlled vocabulary — generated from the cqmAP SelectionLists sheet (npm run gen:vocab)
const { COMPONENT_TYPES, PRODUCT_TYPES, CERT_STATUSES } = require('../seed-data/nexus/cqmap-vocab.generated');

const NexusAuditComponent = sequelize.define('NexusAuditComponent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  component_type: { type: DataTypes.TEXT, allowNull: false, validate: { isIn: [COMPONENT_TYPES] } },
  article_number: { type: DataTypes.STRING(100) },
  used_for_product: { type: DataTypes.STRING(100), validate: { isIn: [PRODUCT_TYPES] } },
  supplier_name: { type: DataTypes.STRING(255) },
  supplier_city: { type: DataTypes.STRING(100) },
  supplier_country_code: { type: DataTypes.CHAR(2) },
  // Certification Status — from the cqmAP SelectionLists "Certification Status" list
  cert_status: {
    type: DataTypes.STRING(50),
    validate: { isIn: [CERT_STATUSES] },
  },
  cert_label: { type: DataTypes.STRING(100) },
  comment: { type: DataTypes.TEXT },
}, {
  tableName: 'nexus_audit_components',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusAuditComponent;
