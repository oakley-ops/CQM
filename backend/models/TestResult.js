const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * TestResult Model (formerly Task)
 * Represents results from quality tests performed on card production
 */
const TestResult = sequelize.define('TestResult', {
  // Primary Key
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // ==========================================
  // Core Relationships
  // ==========================================
  facility_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'manufacturing_facilities',
      key: 'id'
    },
    comment: 'Manufacturing facility where test was performed'
  },
  test_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Foreign key to test_definitions table (to be created)'
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Foreign key to production_batches table (to be created)'
  },

  // ==========================================
  // Test Information
  // ==========================================
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Test name is required'
      }
    },
    comment: 'Test name or test code'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Test description or notes'
  },
  test_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    comment: 'Date test was performed'
  },
  test_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Unique test reference number'
  },

  // ==========================================
  // Sample Information
  // ==========================================
  sample_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Sample identifier or batch number'
  },
  sample_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of samples tested'
  },
  card_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Card type tested: Contact, Contactless, Dual'
  },
  card_technology: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Technology: EMV, Magnetic, RFID'
  },

  // ==========================================
  // Test Results
  // ==========================================
  result_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pending',
    validate: {
      isIn: {
        args: [['Pass', 'Fail', 'Conditional Pass', 'Invalid', 'Pending Review', 'Pending']],
        msg: 'Invalid result status'
      }
    }
  },
  measured_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: 'Measured test value'
  },
  measurement_unit: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit of measurement: mm, °C, mA, Pass/Fail, etc.'
  },

  // ==========================================
  // Test Personnel
  // ==========================================
  performed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Test technician who performed the test'
  },
  performed_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Name of test technician'
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Quality manager who reviewed results'
  },
  reviewed_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
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
  // Test Conditions
  // ==========================================
  test_temperature: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Test temperature in °C'
  },
  test_humidity: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Test humidity in %'
  },
  test_conditions_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional test condition notes'
  },

  // ==========================================
  // Failure Analysis
  // ==========================================
  acceptance_met: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Whether acceptance criteria was met'
  },
  failure_mode: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Description of failure mode if test failed'
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Root cause analysis if test failed'
  },
  corrective_action_taken: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Corrective actions taken'
  },
  retest_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // ==========================================
  // Audit Trail
  // ==========================================
  is_audit_sample: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this was part of a CQM audit'
  },
  audit_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Related audit ID if applicable'
  },
  flagged_for_review: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  flag_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Legacy Fields (for compatibility)
  // ==========================================
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Legacy field - maps to performed_by'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'not_started',
    comment: 'Legacy status field'
  },
  priority: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'medium'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  estimated_hours: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  actual_hours: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  parent_task_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Legacy field for task hierarchy'
  },
  wbs_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'test_results',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      name: 'idx_test_results_facility',
      fields: ['facility_id']
    },
    {
      name: 'idx_test_results_date',
      fields: ['test_date']
    },
    {
      name: 'idx_test_results_status',
      fields: ['result_status']
    },
    {
      name: 'idx_test_results_performed_by',
      fields: ['performed_by']
    }
  ]
});

// Instance methods
TestResult.prototype.isPassed = function() {
  return this.result_status === 'Pass';
};

TestResult.prototype.isFailed = function() {
  return this.result_status === 'Fail';
};

TestResult.prototype.needsReview = function() {
  return this.result_status === 'Pending Review' || this.flagged_for_review;
};

module.exports = TestResult;

