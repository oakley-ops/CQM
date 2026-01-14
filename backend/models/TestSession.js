const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TestSession = sequelize.define('TestSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  card_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  manufacturing_stage: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  batch_lot_number: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  card_serial_number: {
    type: DataTypes.STRING(100)
  },
  test_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  equipment_id: {
    type: DataTypes.STRING(100)
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'submitted', 'approved', 'rejected']]
    }
  },
  general_notes: {
    type: DataTypes.TEXT
  },
  submitted_at: {
    type: DataTypes.DATE
  },
  approved_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approved_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'test_sessions',
  timestamps: true,
  underscored: true
});

// Generate session number before create
TestSession.beforeCreate(async (session) => {
  if (!session.session_number) {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Find the count of sessions today
    const { Op } = require('sequelize');
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await TestSession.count({
      where: {
        created_at: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    const sequence = count + 1;
    session.session_number = `TS-${datePrefix}-${String(sequence).padStart(3, '0')}`;
  }
});

module.exports = TestSession;
