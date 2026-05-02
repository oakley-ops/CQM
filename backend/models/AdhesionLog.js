const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdhesionLog = sequelize.define('AdhesionLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  job_number:       { type: DataTypes.STRING(100) },
  job_name:         { type: DataTypes.STRING(200) },
  side:             { type: DataTypes.STRING(1), validate: { isIn: [['F', 'B']] } },
  test_date:        { type: DataTypes.DATEONLY, allowNull: false },
  emv:              { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  csr:              { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  inks:             { type: DataTypes.STRING(300) },
  screen_printed:   { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  core:             { type: DataTypes.STRING(100) },
  core_thickness:   { type: DataTypes.DECIMAL(6, 3) },
  overlay:          { type: DataTypes.STRING(100) },
  coating:          { type: DataTypes.STRING(100) },

  laminator:        { type: DataTypes.STRING(50) },
  lam_temp_f:       { type: DataTypes.SMALLINT },
  dwell_time_sec:   { type: DataTypes.DECIMAL(5, 1) },
  post_cured:       { type: DataTypes.STRING(20) },

  strip_a:          { type: DataTypes.DECIMAL(6, 3) },
  strip_b:          { type: DataTypes.DECIMAL(6, 3) },
  strip_c:          { type: DataTypes.DECIMAL(6, 3) },
  strip_d:          { type: DataTypes.DECIMAL(6, 3) },
  strip_e:          { type: DataTypes.DECIMAL(6, 3) },
  strip_a_tore:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  strip_b_tore:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  strip_c_tore:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  strip_d_tore:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  strip_e_tore:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

  min_lbf_cm:       { type: DataTypes.DECIMAL(6, 3) },
  min_lbf_in:       { type: DataTypes.DECIMAL(6, 3) },

  pass_threshold:   { type: DataTypes.DECIMAL(5, 3), allowNull: false, defaultValue: 1.50 },
  result:           { type: DataTypes.STRING(4), validate: { isIn: [['PASS', 'FAIL']] } },

  test_method:      { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'Peel Test #7120#' },
  tape_spec_confirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  exclusions:       { type: DataTypes.TEXT },

  notes:            { type: DataTypes.TEXT },
  created_by:       { type: DataTypes.INTEGER }
}, {
  tableName: 'adhesion_log',
  timestamps: true,
  underscored: true
});

module.exports = AdhesionLog;
