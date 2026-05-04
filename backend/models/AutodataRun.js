const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AutodataRun = sequelize.define('AutodataRun', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  run_name: { type: DataTypes.STRING(255) },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'queued',
    validate: { isIn: [['queued', 'running', 'completed', 'failed']] },
  },
  config: { type: DataTypes.JSONB },
  stats: { type: DataTypes.JSONB },
  sample_count: { type: DataTypes.INTEGER },
  dataset_path: { type: DataTypes.STRING(500) },
  dataset_format: { type: DataTypes.STRING(50), defaultValue: 'jsonl' },
  error_message: { type: DataTypes.TEXT },
  started_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  created_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'autodata_runs',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = AutodataRun;
