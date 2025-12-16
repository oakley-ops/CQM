const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QualityMetric = sequelize.define('QualityMetric', {
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
  metric_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Metric name is required'
      }
    }
  },
  metric_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  target_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  actual_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  measurement_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: {
      isIn: {
        args: [['on-target', 'at-risk', 'off-target', 'pending']],
        msg: 'Invalid status'
      }
    }
  },
  notes: {
    type: DataTypes.TEXT,
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
  tableName: 'quality_metrics',
  timestamps: true,
  underscored: true
});

module.exports = QualityMetric;
