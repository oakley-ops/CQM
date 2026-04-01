const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestEntryMetadata = sequelize.define('TestEntryMetadata', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'test_sessions', key: 'id' }
  },
  test_definition_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'test_definitions', key: 'id' }
  },
  sampled_by:              { type: DataTypes.STRING(200) },
  technician:              { type: DataTypes.STRING(200) },
  test_time:               { type: DataTypes.TIME },
  temperature_c:           { type: DataTypes.DECIMAL(5, 2) },
  humidity_pct:            { type: DataTypes.DECIMAL(5, 2) },
  calibration_verified:    { type: DataTypes.BOOLEAN },
  calibration_valid_until: { type: DataTypes.DATEONLY },
  env_logger_id:           { type: DataTypes.STRING(100) },
  cal_valid_until:         { type: DataTypes.DATEONLY },
  sample_preconditioned:   { type: DataTypes.BOOLEAN },
  job_notes:               { type: DataTypes.TEXT },
  extra_data:              { type: DataTypes.JSONB },
  pdf_pages:               { type: DataTypes.JSONB },
}, {
  tableName: 'test_entry_metadata',
  timestamps: true,
  underscored: true,
});

module.exports = TestEntryMetadata;
