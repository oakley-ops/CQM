const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Defect = sequelize.define('Defect', {
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
  inspection_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quality_inspections',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Defect title is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  severity: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['critical', 'high', 'medium', 'low']],
        msg: 'Invalid severity'
      }
    }
  },
  priority: {
    type: DataTypes.STRING(50),
    defaultValue: 'medium',
    validate: {
      isIn: {
        args: [['critical', 'high', 'medium', 'low']],
        msg: 'Invalid priority'
      }
    }
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'open',
    validate: {
      isIn: {
        args: [['open', 'in-progress', 'resolved', 'closed', 'rejected']],
        msg: 'Invalid status'
      }
    }
  },
  detected_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  detected_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolved_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'defects',
  timestamps: true,
  underscored: true
});

module.exports = Defect;
