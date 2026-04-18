const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  job_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  card_type: {
    type: DataTypes.STRING(50)
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'completed', 'on_hold', 'cancelled']]
    }
  },
  start_date: {
    type: DataTypes.DATEONLY
  },
  end_date: {
    type: DataTypes.DATEONLY
  },
  description: {
    type: DataTypes.TEXT
  },
  customer_reference: {
    type: DataTypes.STRING(200)
  },
  source_file: {
    type: DataTypes.STRING(100)
  }
}, {
  tableName: 'jobs',
  timestamps: true,
  underscored: true
});

module.exports = Job;
