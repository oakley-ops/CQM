const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Quote = sequelize.define('Quote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quote_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clients',
      key: 'id'
    }
  },
  project_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  priority: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Medium',
    validate: {
      isIn: [['Critical', 'High', 'Medium', 'Low']]
    }
  },
  current_stage: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  current_milestone_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quote_milestones',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Not Started',
    validate: {
      isIn: [['Not Started', 'In Process', 'On Hold', 'Completed', 'Cancelled']]
    }
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  created_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  quote_build_complete_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  approval_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  sent_to_customer_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  signed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  days_in_process: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  review_rejected_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quote_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  probability_percentage: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  converted_to_project_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quotes',
  timestamps: false
});

module.exports = Quote;
