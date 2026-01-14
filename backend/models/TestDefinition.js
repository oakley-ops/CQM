const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestDefinition = sequelize.define('TestDefinition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'test_categories',
      key: 'id'
    }
  },
  test_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  test_name: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  short_name: {
    type: DataTypes.STRING(100)
  },
  iso_standard: {
    type: DataTypes.STRING(100)
  },
  standard_version: {
    type: DataTypes.STRING(50)
  },
  standard_section: {
    type: DataTypes.STRING(50)
  },
  standard_requirement: {
    type: DataTypes.TEXT
  },
  description: {
    type: DataTypes.TEXT
  },
  purpose: {
    type: DataTypes.TEXT
  },
  test_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'passfail'
  },
  procedure: {
    type: DataTypes.TEXT
  },
  test_method: {
    type: DataTypes.TEXT
  },
  test_conditions: {
    type: DataTypes.TEXT
  },
  test_duration: {
    type: DataTypes.STRING(50)
  },
  sample_size: {
    type: DataTypes.INTEGER
  },
  sampling_method: {
    type: DataTypes.TEXT
  },
  equipment_required: {
    type: DataTypes.TEXT
  },
  equipment_specifications: {
    type: DataTypes.TEXT
  },
  calibration_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  calibration_frequency: {
    type: DataTypes.STRING(50)
  },
  pass_criteria: {
    type: DataTypes.TEXT
  },
  fail_criteria: {
    type: DataTypes.TEXT
  },
  expected_result: {
    type: DataTypes.TEXT
  },
  measurement_type: {
    type: DataTypes.STRING(50)
  },
  unit_of_measurement: {
    type: DataTypes.STRING(50)
  },
  target_value: {
    type: DataTypes.DECIMAL(10, 4)
  },
  min_acceptable_value: {
    type: DataTypes.DECIMAL(10, 4)
  },
  max_acceptable_value: {
    type: DataTypes.DECIMAL(10, 4)
  },
  tolerance: {
    type: DataTypes.DECIMAL(10, 4)
  },
  test_frequency: {
    type: DataTypes.STRING(50)
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_cqm_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_destructive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  risk_level: {
    type: DataTypes.STRING(20)
  },
  safety_precautions: {
    type: DataTypes.TEXT
  },
  special_requirements: {
    type: DataTypes.TEXT
  },
  reference_documents: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.STRING)
  },
  notes: {
    type: DataTypes.TEXT
  },
  version: {
    type: DataTypes.STRING(20)
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active'
  },
  effective_date: {
    type: DataTypes.DATEONLY
  },
  superseded_by_id: {
    type: DataTypes.INTEGER
  },
  superseded_date: {
    type: DataTypes.DATEONLY
  },
  created_by: {
    type: DataTypes.INTEGER
  },
  approved_by: {
    type: DataTypes.INTEGER
  },
  approval_date: {
    type: DataTypes.DATEONLY
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'test_definitions',
  timestamps: true,
  underscored: true,
  // Virtual getters for API compatibility
  getterMethods: {
    test_code() {
      return this.test_id;
    },
    unit_of_measure() {
      return this.unit_of_measurement;
    },
    min_value() {
      return this.min_acceptable_value;
    },
    max_value() {
      return this.max_acceptable_value;
    },
    iso_reference() {
      return this.iso_standard;
    },
    display_order() {
      return this.id; // Use id as display order if not available
    },
    is_required() {
      return this.is_mandatory;
    },
    is_active() {
      return this.status === 'active';
    }
  }
});

module.exports = TestDefinition;
