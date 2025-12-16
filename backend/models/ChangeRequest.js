const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChangeRequest = sequelize.define('ChangeRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Change request title is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  estimated_cost: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  estimated_time_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  priority: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['low', 'medium', 'high', 'critical']],
        msg: 'Invalid priority'
      }
    }
  },
  requested_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: {
      isIn: {
        args: [['pending', 'under_review', 'approved', 'rejected', 'implemented', 'cancelled']],
        msg: 'Invalid status'
      }
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
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  review_notes: {
    type: DataTypes.TEXT,
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
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approval_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  implemented_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  implementation_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'change_requests',
  timestamps: true
});

module.exports = ChangeRequest;
