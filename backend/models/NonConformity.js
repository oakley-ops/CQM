const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * NonConformity Model (formerly Risk)
 * Represents non-conformities found during audits (Major, Minor, Observation)
 */
const NonConformity = sequelize.define('NonConformity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
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
  // NC Identification
  nc_reference: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique NC reference number'
  },
  nc_title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'NC title is required'
      }
    }
  },
  nc_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['Major', 'Minor', 'Observation']],
        msg: 'NC type must be Major, Minor, or Observation'
      }
    }
  },
  // NC Details
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'NC description is required'
      }
    }
  },
  requirement_violated: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Which ISO requirement was violated'
  },
  iso_standard_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ISO 7810:2003 clause 5.3, etc.'
  },
  // Finding Information
  finding_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  discovery_method: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Audit, Inspection, Test, Customer Complaint'
  },
  evidence_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Impact Assessment
  impact_severity: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['Critical', 'High', 'Medium', 'Low']],
        msg: 'Invalid severity'
      }
    }
  },
  potential_risks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customer_impact: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'None, Potential, Actual'
  },
  // Root Cause Analysis
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  root_cause_analysis_method: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '5 Whys, Fishbone, etc.'
  },
  root_cause_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Responsible Parties
  raised_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  raised_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_to_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  quality_manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Status & Timeline
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Open',
    validate: {
      isIn: {
        args: [['Open', 'CAPA Assigned', 'Under Review', 'Closed', 'Verified']],
        msg: 'Invalid status'
      }
    }
  },
  identified_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  target_closure_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_closure_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Closure Information
  closure_verification: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  verification_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  effectiveness_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Priority
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
  escalated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  escalation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  escalation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  internal_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Legacy Fields (from Risk)
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Legacy field - maps to nc_title'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  probability: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Legacy risk probability field'
  },
  impact: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Legacy risk impact field'
  },
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  mitigation_strategy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contingency_plan: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'non_conformities',
  timestamps: true,
  underscored: true
});

// Instance methods
NonConformity.prototype.isMajor = function() {
  return this.nc_type === 'Major';
};

NonConformity.prototype.isMinor = function() {
  return this.nc_type === 'Minor';
};

NonConformity.prototype.isObservation = function() {
  return this.nc_type === 'Observation';
};

NonConformity.prototype.isOpen = function() {
  return this.status === 'Open';
};

NonConformity.prototype.isClosed = function() {
  return this.status === 'Closed' || this.status === 'Verified';
};

module.exports = NonConformity;

