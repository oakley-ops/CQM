const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Audit Model (formerly Milestone)
 * Represents CQM audits for manufacturing facilities
 */
const Audit = sequelize.define('Audit', {
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
  // Audit Basic Information
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Audit name is required'
      }
    },
    comment: 'Audit name or title'
  },
  audit_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Unique audit reference number'
  },
  audit_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Initial',
    validate: {
      isIn: {
        args: [['Initial', 'Surveillance', 'Re-certification', 'Remote', 'Special']],
        msg: 'Invalid audit type'
      }
    }
  },
  audit_scope: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Audit Schedule
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Scheduled audit date'
  },
  scheduled_duration_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 2
  },
  actual_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actual_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // Audit Team
  lead_auditor_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  lead_auditor_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  auditor_organization: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'Smart Consulting'
  },
  // Audit Status & Phase
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Scheduled',
    validate: {
      isIn: {
        args: [['Scheduled', 'Pre-Audit', 'In Progress', 'Completed', 'Report Issued', 'Closed', 'Cancelled']],
        msg: 'Invalid audit status'
      }
    }
  },
  current_phase: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Planning, Pre-Audit, On-site, Post-Audit, CAP, Closure'
  },
  // Pre-Audit Phase
  pre_audit_started: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pre_audit_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  pre_audit_completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  cqmgiap_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Internal Audit results completed'
  },
  cqmap_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Audit Plan completed'
  },
  // Findings Summary
  major_nc_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  minor_nc_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  observation_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Post-Audit
  report_issued: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  report_issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // CAPA Phase
  cap_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cap_submitted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cap_accepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  all_nc_closed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Closure
  audit_closed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  closure_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  certificate_issued: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Audit Outcome
  recommendation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [['Approve', 'Approve with CAP', 'Reject', 'Defer']],
        msg: 'Invalid recommendation'
      }
    }
  },
  overall_assessment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Legacy Fields
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Legacy field - maps to scheduled_date'
  },
  completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Legacy field - maps to closure_date'
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
  tableName: 'audits',
  timestamps: true,
  underscored: true
});

// Instance methods
Audit.prototype.isInProgress = function() {
  return this.status === 'In Progress';
};

Audit.prototype.isCompleted = function() {
  return this.status === 'Completed' || this.status === 'Closed';
};

Audit.prototype.hasFindings = function() {
  return (this.major_nc_count + this.minor_nc_count + this.observation_count) > 0;
};

module.exports = Audit;

