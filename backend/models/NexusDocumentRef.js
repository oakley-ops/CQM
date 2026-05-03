const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusDocumentRef = sequelize.define('NexusDocumentRef', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  audit_record_id: { type: DataTypes.INTEGER, allowNull: false },
  requirement_id: { type: DataTypes.STRING(10) },
  doc_id: { type: DataTypes.STRING(50) },
  title: { type: DataTypes.TEXT, allowNull: false },
  doc_type: { type: DataTypes.STRING(50) },
  version: { type: DataTypes.STRING(20) },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'nexus_document_refs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusDocumentRef;
