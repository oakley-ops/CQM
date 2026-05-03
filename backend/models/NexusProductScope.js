const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusProductScope = sequelize.define('NexusProductScope', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  product_category: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['ic', 'icm', 'il', 'cb', 'icc', 'p', 'iacicm', 'bsm', 'iacil', 'iac']] },
  },
  product_variant: { type: DataTypes.STRING(100) },
  product_name: { type: DataTypes.STRING(255) },
  in_scope: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  audited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  rank: {
    type: DataTypes.CHAR(1),
    defaultValue: 'tbd',
    validate: { isIn: [['A', 'B', 'C', 'D', 't']] }, // 't' stored for 'tbd' (single char)
  },
  cert_outcome: {
    type: DataTypes.CHAR(1),
    validate: { isIn: [['A', 'R', 'F', 'N']] },
  },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'nexus_product_scopes',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusProductScope;
