const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Risk = sequelize.define('Risk', {
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
        msg: 'Risk title is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [['technical', 'external', 'organizational', 'project-management', 'financial', 'legal', 'other']],
        msg: 'Invalid category'
      }
    }
  },
  probability: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['very-low', 'low', 'medium', 'high', 'very-high']],
        msg: 'Invalid probability'
      }
    }
  },
  impact: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['very-low', 'low', 'medium', 'high', 'very-high']],
        msg: 'Invalid impact'
      }
    }
  },
  risk_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Calculated as probability x impact (1-25)'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'identified',
    validate: {
      isIn: {
        args: [['identified', 'assessed', 'mitigated', 'monitoring', 'closed', 'occurred']],
        msg: 'Invalid status'
      }
    }
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  response_strategy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['avoid', 'mitigate', 'transfer', 'accept', 'exploit', 'enhance', 'share']],
        msg: 'Invalid response strategy'
      }
    }
  },
  response_plan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contingency_plan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trigger_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  identified_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'risks',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeSave: (risk) => {
      // Calculate risk score based on probability and impact
      const probValues = { 'very-low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very-high': 5 };
      const impactValues = { 'very-low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very-high': 5 };
      
      if (risk.probability && risk.impact) {
        const probValue = probValues[risk.probability] || 3;
        const impactValue = impactValues[risk.impact] || 3;
        risk.risk_score = probValue * impactValue;
      }
    }
  }
});

module.exports = Risk;
