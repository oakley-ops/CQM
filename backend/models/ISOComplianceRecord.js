const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ISOComplianceRecord Model (formerly QualityMetric)
 * Tracks compliance with ISO standards and quality requirements
 */
const ISOComplianceRecord = sequelize.define('ISOComplianceRecord', {
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
    }
  },
  audit_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'audits',
      key: 'id'
    }
  },

  // ==========================================
  // ISO Standard Reference
  // ==========================================
  iso_standard: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'ISO standard number (e.g., ISO/IEC 7810, ISO/IEC 7816-1)'
  },
  standard_version: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Version/year of the standard (e.g., 2019)'
  },
  standard_section: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Specific section/clause (e.g., 6.1.2)'
  },
  standard_title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Full title of the standard or section'
  },

  // ==========================================
  // Requirement Details
  // ==========================================
  requirement_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Unique identifier for the requirement'
  },
  requirement_description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Requirement description is required'
      }
    }
  },
  requirement_category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [[
          'Physical Characteristics',
          'Electrical Interface',
          'Chip Functionality',
          'Environmental Testing',
          'Durability Testing',
          'Material Safety',
          'Production Process',
          'Quality Management',
          'Documentation',
          'Other'
        ]],
        msg: 'Invalid requirement category'
      }
    }
  },

  // ==========================================
  // Compliance Status
  // ==========================================
  compliance_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Not Assessed',
    validate: {
      isIn: {
        args: [['Compliant', 'Non-Compliant', 'Partially Compliant', 'Not Assessed', 'Not Applicable', 'Under Review']],
        msg: 'Invalid compliance status'
      }
    }
  },
  assessment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  next_assessment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  assessment_frequency_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },

  // ==========================================
  // Metrics and Values
  // ==========================================
  metric_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Name of the measured metric'
  },
  metric_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [[
          'Dimensional',
          'Temperature',
          'Humidity',
          'Resistance',
          'Voltage',
          'Current',
          'Durability',
          'Pass/Fail',
          'Percentage',
          'Count',
          'Other'
        ]],
        msg: 'Invalid metric type'
      }
    }
  },
  target_value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true
  },
  actual_value: {
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
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  // ==========================================
  // Test/Verification Information
  // ==========================================
  test_method: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the test method used'
  },
  test_equipment: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  test_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference to test procedure/specification'
  },
  sample_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pass_fail_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Personnel
  // ==========================================
  assessed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  verified_by: {
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

  // ==========================================
  // Evidence and Documentation
  // ==========================================
  evidence_document_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'qms_documents',
      key: 'id'
    }
  },
  evidence_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  evidence_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  supporting_documents: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'URLs or IDs of supporting documents'
  },

  // ==========================================
  // Non-Compliance Handling
  // ==========================================
  nc_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'non_conformities',
      key: 'id'
    },
    comment: 'Related non-conformity if non-compliant'
  },
  deviation_justification: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  corrective_action_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  capa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'capa_actions',
      key: 'id'
    }
  },

  // ==========================================
  // Priority and Risk
  // ==========================================
  priority: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Medium',
    validate: {
      isIn: {
        args: [['Critical', 'High', 'Medium', 'Low']],
        msg: 'Invalid priority'
      }
    }
  },
  risk_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['High', 'Medium', 'Low']],
        msg: 'Invalid risk level'
      }
    }
  },
  impact_assessment: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Additional Information
  // ==========================================
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Tracking
  // ==========================================
  is_critical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is this a critical requirement?'
  },
  is_applicable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // ==========================================
  // Metadata
  // ==========================================
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },

  // ==========================================
  // Legacy Fields (from QualityMetric)
  // ==========================================
  measurement_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Legacy field - maps to assessment_date'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Legacy field - maps to compliance_status'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'iso_compliance_records',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['facility_id']
    },
    {
      fields: ['audit_id']
    },
    {
      fields: ['iso_standard']
    },
    {
      fields: ['requirement_id']
    },
    {
      fields: ['compliance_status']
    },
    {
      fields: ['assessment_date']
    },
    {
      fields: ['next_assessment_date']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['is_critical']
    },
    {
      fields: ['is_archived']
    }
  ]
});

// Instance methods
ISOComplianceRecord.prototype.isCompliant = function() {
  return this.compliance_status === 'Compliant';
};

ISOComplianceRecord.prototype.isNonCompliant = function() {
  return this.compliance_status === 'Non-Compliant';
};

ISOComplianceRecord.prototype.requiresAction = function() {
  return this.isNonCompliant() || this.compliance_status === 'Partially Compliant';
};

ISOComplianceRecord.prototype.isDueForReassessment = function() {
  if (!this.next_assessment_date) return false;
  const assessmentDate = new Date(this.next_assessment_date);
  const today = new Date();
  return today >= assessmentDate;
};

ISOComplianceRecord.prototype.isWithinTolerance = function() {
  if (this.actual_value === null || this.actual_value === undefined) return null;
  if (this.target_value === null || this.target_value === undefined) return null;
  
  if (this.tolerance !== null && this.tolerance !== undefined) {
    const diff = Math.abs(parseFloat(this.actual_value) - parseFloat(this.target_value));
    return diff <= parseFloat(this.tolerance);
  }
  
  if (this.min_acceptable_value !== null && this.max_acceptable_value !== null) {
    const value = parseFloat(this.actual_value);
    return value >= parseFloat(this.min_acceptable_value) && value <= parseFloat(this.max_acceptable_value);
  }
  
  return null;
};

module.exports = ISOComplianceRecord;

