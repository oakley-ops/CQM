const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestSession = sequelize.define('TestSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  card_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  job_name: {
    type: DataTypes.STRING(200)
  },
  manufacturing_stage: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  batch_lot_number: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  cat_number: {
    type: DataTypes.STRING(100)
  },
  card_serial_number: {
    type: DataTypes.STRING(100)
  },
  test_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  equipment_id: {
    type: DataTypes.STRING(100)
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'submitted', 'approved', 'rejected']]
    }
  },
  general_notes: {
    type: DataTypes.TEXT
  },
  submitted_at: {
    type: DataTypes.DATE
  },
  approved_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'test_sessions',
  timestamps: true,
  underscored: true
});


module.exports = TestSession;
