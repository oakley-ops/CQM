const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CommunicationLog = sequelize.define('CommunicationLog', {
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
  communication_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['email', 'meeting', 'phone', 'chat', 'document', 'other']],
        msg: 'Invalid communication type'
      }
    }
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  recipients: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of recipient IDs'
  },
  communication_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  priority: {
    type: DataTypes.STRING(50),
    defaultValue: 'normal',
    validate: {
      isIn: {
        args: [['low', 'normal', 'high', 'urgent']],
        msg: 'Invalid priority'
      }
    }
  }
}, {
  tableName: 'communication_logs',
  timestamps: true,
  underscored: true
});

module.exports = CommunicationLog;
