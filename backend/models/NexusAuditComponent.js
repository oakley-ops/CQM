const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusAuditComponent = sequelize.define('NexusAuditComponent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  component_type: { type: DataTypes.TEXT, allowNull: false },
  article_number: { type: DataTypes.STRING(100) },
  used_for_product: { type: DataTypes.STRING(100) },
  supplier_name: { type: DataTypes.STRING(255) },
  supplier_city: { type: DataTypes.STRING(100) },
  supplier_country_code: { type: DataTypes.CHAR(2) },
  cert_status: {
    type: DataTypes.STRING(50),
    validate: { isIn: [['CQM Certified', 'CQM Recognised', 'Pending', 'Not Certified', 'N/A']] },
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
