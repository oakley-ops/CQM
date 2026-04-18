const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KappaStudy = sequelize.define('KappaStudy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  study_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  test_definition_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  card_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  sample_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  trial_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
  },
  attribute_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'passfail',
    validate: {
      isIn: [['passfail', 'categorical']],
    },
  },
  attribute_options: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['Pass', 'Fail'],
  },
  reference_type: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'predefined',
    validate: {
      isIn: [['predefined', 'master_appraiser']],
    },
  },
  reference_data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  master_appraiser_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'complete']],
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'kappa_studies',
  timestamps: true,
  underscored: true,
});

module.exports = KappaStudy;
