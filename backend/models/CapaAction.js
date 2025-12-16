const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CapaAction Model (formerly ChangeRequest)
 * Represents Corrective and Preventive Actions for non-conformities
 */
const CapaAction = sequelize.define('CapaAction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // ==========================================
  // Core Relationships
  // ==========================================
  nc_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'non_conformities',
      key: 'id'
    },
    comment: 'Related non-conformity'
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

  // ==========================================
  // CAPA Identification
  // ==========================================
  capa_reference: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique CAPA reference number'
  },
  capa_title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'CAPA title is required'
      }
    }
  },
  capa_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['Corrective', 'Preventive', 'Both']],
        msg: 'CAPA type must be Corrective, Preventive, or Both'
      }
    }
  },

  // ==========================================
  // CAPA Description
  // ==========================================
  problem_statement: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Problem statement is required'
      }
    }
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Root cause is required'
      }
    }
  },
  proposed_action: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Proposed action is required'
      }
    }
  },
  action_plan: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Action plan is required'
      }
    }
  },

  // ==========================================
  // Implementation
  // ==========================================
  resources_required: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  actual_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },

  // ==========================================
  // Responsibility
  // ==========================================
  raised_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  management_sponsor: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Management sponsor name'
  },

  // ==========================================
  // Timeline
  // ==========================================
  submission_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  target_completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  actual_completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Status
  // ==========================================
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Submitted',
    validate: {
      isIn: {
        args: [['Submitted', 'Under Review', 'Approved', 'In Progress', 'Completed', 'Verified', 'Closed', 'Rejected']],
        msg: 'Invalid status'
      }
    }
  },
  approval_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pending',
    validate: {
      isIn: {
        args: [['Pending', 'Approved', 'Rejected']],
        msg: 'Invalid approval status'
      }
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
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Progress Tracking
  // ==========================================
  progress_percentage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  current_step: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  obstacles: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Evidence of Completion
  // ==========================================
  completion_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Effectiveness Review
  // ==========================================
  effectiveness_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  effectiveness_review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  effectiveness_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  effectiveness_verification_method: {
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
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Follow-up
  // ==========================================
  follow_up_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  follow_up_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  follow_up_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Priority
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

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  internal_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Legacy Fields (from ChangeRequest)
  // ==========================================
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Legacy field - maps to capa_title'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Legacy field - maps to problem_statement'
  },
  justification: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  impact_analysis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scope_impact: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  schedule_impact: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cost_impact: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  quality_impact: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  estimated_time_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  review_comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  implemented_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  implementation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  closure_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'capa_actions',
  timestamps: true,
  underscored: true
});

// Instance methods
CapaAction.prototype.isApproved = function() {
  return this.approval_status === 'Approved';
};

CapaAction.prototype.isInProgress = function() {
  return this.status === 'In Progress';
};

CapaAction.prototype.isCompleted = function() {
  return this.status === 'Completed' || this.status === 'Verified' || this.status === 'Closed';
};

CapaAction.prototype.isOverdue = function() {
  if (this.isCompleted()) return false;
  if (!this.target_completion_date) return false;
  const targetDate = new Date(this.target_completion_date);
  const today = new Date();
  return today > targetDate;
};

CapaAction.prototype.getDaysUntilDue = function() {
  if (!this.target_completion_date) return null;
  const targetDate = new Date(this.target_completion_date);
  const today = new Date();
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

module.exports = CapaAction;

