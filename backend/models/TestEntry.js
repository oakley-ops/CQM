const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestEntry = sequelize.define('TestEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'test_sessions',
      key: 'id'
    }
  },
  test_definition_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'test_definitions',
      key: 'id'
    }
  },
  measurement_value: {
    type: DataTypes.DECIMAL(10, 4)
  },
  assessment_value: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['Excellent', 'Good', 'Acceptable', 'Poor', null]]
    }
  },
  pass_status: {
    type: DataTypes.BOOLEAN
  },
  multi_value_notes: {
    type: DataTypes.TEXT
  },
  notes: {
    type: DataTypes.TEXT
  },
  retest_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'test_entries',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['session_id', 'test_definition_id']
    }
  ]
});

module.exports = TestEntry;
