const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuoteAction = sequelize.define('QuoteAction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quote_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quotes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  action_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Next Action',
    validate: {
      isIn: [['Next Action', 'Follow-up', 'Blocker', 'Note']]
    }
  },
  description: {
    type: DataTypes.TEXT,
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
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quote_actions',
  timestamps: false
});

module.exports = QuoteAction;
