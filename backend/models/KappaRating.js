const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const KappaRating = sequelize.define('KappaRating', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  study_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  appraiser_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sample_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  trial_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  rating: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
}, {
  tableName: 'kappa_ratings',
  timestamps: true,
  underscored: true,
  updatedAt: false, // only created_at in schema
  indexes: [
    {
      unique: true,
      fields: ['study_id', 'appraiser_id', 'sample_number', 'trial_number'],
      name: 'uq_kappa_rating',
    },
  ],
});

module.exports = KappaRating;
