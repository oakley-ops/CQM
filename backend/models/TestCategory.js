const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TestCategory Model
 * Organizes test definitions into categories (e.g., Physical Tests, EMV Tests)
 */
const TestCategory = sequelize.define('TestCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // ==========================================
  // Category Information
  // ==========================================
  category_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique code for the category (e.g., PHY, EMV, MAG)'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Category name is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Standards Reference
  // ==========================================
  iso_standard: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Primary ISO standard (e.g., ISO 7810)'
  },
  standard_reference: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Full standard reference and related standards'
  },

  // ==========================================
  // Organization
  // ==========================================
  parent_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'test_categories',
      key: 'id'
    },
    comment: 'For hierarchical categories'
  },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Order for display in UI'
  },

  // ==========================================
  // Status
  // ==========================================
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is testing in this category mandatory for CQM?'
  },

  // ==========================================
  // Metadata
  // ==========================================
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Icon name for UI display'
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Color code for UI display'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'test_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['category_code'],
      unique: true
    },
    {
      fields: ['parent_category_id']
    },
    {
      fields: ['display_order']
    },
    {
      fields: ['is_active']
    }
  ]
});

// Instance methods
TestCategory.prototype.isActive = function() {
  return this.is_active === true;
};

TestCategory.prototype.isMandatory = function() {
  return this.is_mandatory === true;
};

module.exports = TestCategory;

