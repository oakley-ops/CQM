const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MeetingMinute = sequelize.define('MeetingMinute', {
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
  meeting_title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  meeting_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attendees: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of attendee IDs'
  },
  agenda: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discussion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  decisions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  action_items: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  next_meeting: {
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
  }
}, {
  tableName: 'meeting_minutes',
  timestamps: true,
  underscored: true
});

module.exports = MeetingMinute;
