const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RagDocument = sequelize.define('RagDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  file_path: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  vector_store_path: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  chunk_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pending', 'ready', 'error'),
    defaultValue: 'pending',
    allowNull: false,
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ingested_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  ingested_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'rag_documents',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = RagDocument;
