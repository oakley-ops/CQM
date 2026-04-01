const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SampleCard = sequelize.define('SampleCard', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'test_sessions', key: 'id' }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'test_categories', key: 'id' }
  },
  card_number: { type: DataTypes.INTEGER, allowNull: false },
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'sample_cards',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['session_id', 'category_id', 'card_number'] }]
});

module.exports = SampleCard;
