const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TestDefinition Model
 * Defines the ~100 tests required for card quality management
 */
const TestDefinition = sequelize.define('TestDefinition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // ==========================================
  // Core Relationships
  // ==========================================
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'test_categories',
      key: 'id'
    }
  },

  // ==========================================
  // Test Identification
  // ==========================================
  test_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique test identifier (e.g., PHY-TOX-001)'
  },
  test_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Test name is required'
      }
    }
  },
  short_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Short/abbreviated test name'
  },

  // ==========================================
  // Standards Reference
  // ==========================================
  iso_standard: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Applicable ISO standard (e.g., ISO 7810, ISO 7816-1)'
  },
  standard_version: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  standard_section: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Specific section/clause (e.g., Annex A.1)'
  },
  standard_requirement: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Full text of the standard requirement'
  },

  // ==========================================
  // Test Description
  // ==========================================
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Test description is required'
      }
    }
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Purpose of the test'
  },
  test_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [[
          'Physical',
          'Electrical',
          'Environmental',
          'Durability',
          'Chemical Resistance',
          'Dimensional',
          'Functional',
          'Performance',
          'Safety',
          'Other'
        ]],
        msg: 'Invalid test type'
      }
    }
  },

  // ==========================================
  // Test Procedure
  // ==========================================
  procedure: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Test procedure is required'
      }
    }
  },
  test_method: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  test_conditions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Environmental conditions, temperature, humidity, etc.'
  },
  test_duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Duration of the test (e.g., 24 hours, 100 cycles)'
  },
  sample_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Required sample size'
  },
  sampling_method: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Test Equipment
  // ==========================================
  equipment_required: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'List of equipment needed'
  },
  equipment_specifications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  calibration_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  calibration_frequency: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Calibration frequency (e.g., annually, quarterly)'
  },

  // ==========================================
  // Pass/Fail Criteria
  // ==========================================
  pass_criteria: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Pass criteria is required'
      }
    }
  },
  fail_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expected_result: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Measurement Parameters
  // ==========================================
  measurement_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [[
          'Numeric',
          'Pass/Fail',
          'Visual Inspection',
          'Percentage',
          'Range',
          'Multiple Choice',
          'Other'
        ]],
        msg: 'Invalid measurement type'
      }
    }
  },
  unit_of_measurement: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit (e.g., mm, °C, V, mA, %)'
  },
  target_value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  min_acceptable_value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  max_acceptable_value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  tolerance: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },

  // ==========================================
  // Test Classification
  // ==========================================
  test_frequency: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'How often this test is performed (e.g., per batch, monthly)'
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Is this test mandatory for CQM certification?'
  },
  is_cqm_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_destructive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Does this test destroy the sample?'
  },
  risk_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['Critical', 'High', 'Medium', 'Low']],
        msg: 'Invalid risk level'
      }
    }
  },

  // ==========================================
  // Additional Information
  // ==========================================
  safety_precautions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  special_requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reference_documents: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'References to related documents, procedures, specs'
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Status and Versioning
  // ==========================================
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '1.0'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Active',
    validate: {
      isIn: {
        args: [['Draft', 'Active', 'Under Review', 'Superseded', 'Obsolete']],
        msg: 'Invalid status'
      }
    }
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  superseded_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'test_definitions',
      key: 'id'
    },
    comment: 'ID of the test definition that supersedes this one'
  },
  superseded_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Responsibility
  // ==========================================
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approval_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Metadata
  // ==========================================
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'test_definitions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['test_id'],
      unique: true
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['iso_standard']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_mandatory']
    },
    {
      fields: ['is_cqm_required']
    },
    {
      fields: ['test_type']
    },
    {
      fields: ['risk_level']
    }
  ]
});

// Instance methods
TestDefinition.prototype.isActive = function() {
  return this.status === 'Active';
};

TestDefinition.prototype.isMandatory = function() {
  return this.is_mandatory === true;
};

TestDefinition.prototype.isDestructive = function() {
  return this.is_destructive === true;
};

TestDefinition.prototype.requiresCalibration = function() {
  return this.calibration_required === true;
};

TestDefinition.prototype.isSuperseded = function() {
  return this.status === 'Superseded' && this.superseded_by_id !== null;
};

module.exports = TestDefinition;

