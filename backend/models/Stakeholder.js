const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Stakeholder = sequelize.define('Stakeholder', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Stakeholder name is required'
      }
    }
  },
  role: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  organization: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Please provide a valid email'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  interest_level: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['very_low', 'low', 'medium', 'high', 'very_high']],
        msg: 'Invalid interest level'
      }
    }
  },
  influence_level: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['very_low', 'low', 'medium', 'high', 'very_high']],
        msg: 'Invalid influence level'
      }
    }
  },
  engagement_strategy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  communication_frequency: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stakeholders',
  timestamps: true
});

module.exports = Stakeholder;
