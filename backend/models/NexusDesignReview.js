const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NexusDesignReview = sequelize.define('NexusDesignReview', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  review_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['intermediate', 'final']] },
  },
  reviewer: { type: DataTypes.STRING(255) },
  review_date: { type: DataTypes.DATEONLY },
  outcome: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    validate: { isIn: [['approved', 'conditional', 'rejected', 'pending']] },
  },
  notes: { type: DataTypes.TEXT },
  created_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'nexus_design_reviews',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = NexusDesignReview;
