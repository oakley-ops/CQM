module.exports = {
  // User Roles
  ROLES: {
    ADMIN: 'admin',
    PROJECT_MANAGER: 'project_manager',
    TEAM_LEAD: 'team_lead',
    TEAM_MEMBER: 'team_member',
    STAKEHOLDER: 'stakeholder'
  },

  // Project Status
  PROJECT_STATUS: {
    PLANNING: 'planning',
    IN_PROGRESS: 'in_progress',
    ON_HOLD: 'on_hold',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  // Task Status
  TASK_STATUS: {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
    CANCELLED: 'cancelled'
  },

  // Risk Levels
  RISK_PROBABILITY: {
    VERY_LOW: 'very_low',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    VERY_HIGH: 'very_high'
  },

  RISK_IMPACT: {
    VERY_LOW: 'very_low',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    VERY_HIGH: 'very_high'
  },

  // Risk Response Strategies
  RISK_STRATEGIES: {
    AVOID: 'avoid',
    MITIGATE: 'mitigate',
    TRANSFER: 'transfer',
    ACCEPT: 'accept'
  },

  // Change Request Status
  CHANGE_REQUEST_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    IMPLEMENTED: 'implemented'
  },

  // Quality Status
  QUALITY_STATUS: {
    PENDING: 'pending',
    PASSED: 'passed',
    FAILED: 'failed'
  },

  // Defect Severity
  DEFECT_SEVERITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
  },

  // Task Dependency Types
  DEPENDENCY_TYPES: {
    FS: 'FS', // Finish-to-Start
    SS: 'SS', // Start-to-Start
    FF: 'FF', // Finish-to-Finish
    SF: 'SF'  // Start-to-Finish
  },

  // Stakeholder Levels
  STAKEHOLDER_LEVELS: {
    VERY_LOW: 'very_low',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    VERY_HIGH: 'very_high'
  }
};
