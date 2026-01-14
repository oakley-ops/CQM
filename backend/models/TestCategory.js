const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestCategory = sequelize.define('TestCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    // Virtual getter for backward compatibility
    get() {
      return this.getDataValue('name');
    }
  },
  description: {
    type: DataTypes.TEXT
  },
  iso_standard: {
    type: DataTypes.STRING(100)
  },
  standard_reference: {
    type: DataTypes.TEXT
  },
  parent_category_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'test_categories',
      key: 'id'
    }
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  icon: {
    type: DataTypes.STRING(50)
  },
  color: {
    type: DataTypes.STRING(20)
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'test_categories',
  timestamps: true,
  underscored: true,
  // Virtual fields for API compatibility
  getterMethods: {
    category_name() {
      return this.name;
    },
    section_number() {
      return this.iso_standard || '';
    },
    card_type() {
      return 'ALL'; // Default since existing table doesn't have this field
    }
  }
});

module.exports = TestCategory;
