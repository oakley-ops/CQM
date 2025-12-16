const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LessonLearned = sequelize.define('LessonLearned', {
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
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Lesson title is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  what_worked: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  what_didnt_work: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  impact: {
    type: DataTypes.STRING(50),
    defaultValue: 'neutral',
    validate: {
      isIn: {
        args: [['positive', 'negative', 'neutral']],
        msg: 'Invalid impact'
      }
    }
  },
  phase: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [['initiation', 'planning', 'execution', 'monitoring', 'closing']],
        msg: 'Invalid phase'
      }
    }
  },
  documented_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'lessons_learned',
  timestamps: true
});

module.exports = LessonLearned;
