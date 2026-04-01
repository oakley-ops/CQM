const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KpiConfig = sequelize.define('KpiConfig', {
  id:                { type: DataTypes.INTEGER,      primaryKey: true, autoIncrement: true },
  kpi_key:           { type: DataTypes.STRING(100),  allowNull: false, unique: true },
  kpi_name:          { type: DataTypes.STRING(200),  allowNull: false },
  description:       { type: DataTypes.TEXT },
  target_value:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  warning_threshold: { type: DataTypes.DECIMAL(10, 2) },
  unit:              { type: DataTypes.STRING(50) },
  higher_is_better:  { type: DataTypes.BOOLEAN,      defaultValue: true },
  is_active:         { type: DataTypes.BOOLEAN,      defaultValue: true },
}, {
  tableName: 'kpi_config',
  timestamps: true,
  underscored: true,
});

module.exports = KpiConfig;
