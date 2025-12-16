const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QualityInspection = sequelize.define('QualityInspection', {
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
  inspection_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Inspection name is required'
      }
    }
  },
  inspection_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  inspection_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'scheduled',
    validate: {
      isIn: {
        args: [['scheduled', 'in-progress', 'completed', 'approved', 'rejected']],
        msg: 'Invalid status'
      }
    }
  },
  result: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['pass', 'fail', 'conditional']],
        msg: 'Invalid result'
      }
    }
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  findings: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recommendations: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'quality_inspections',
  timestamps: true,
  underscored: true
});

module.exports = QualityInspection;
