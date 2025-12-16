const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CardBatch Model
 * Tracks production batches of smart cards
 */
const CardBatch = sequelize.define('CardBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // ==========================================
  // Core Relationships
  // ==========================================
  facility_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'manufacturing_facilities',
      key: 'id'
    }
  },

  // ==========================================
  // Batch Identification
  // ==========================================
  batch_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique batch/lot number'
  },
  batch_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  internal_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Internal tracking reference'
  },

  // ==========================================
  // Product Information
  // ==========================================
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Product name is required'
      }
    }
  },
  product_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  product_version: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  card_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isIn: {
        args: [[
          'Contact',
          'Contactless',
          'Dual Interface',
          'Magnetic Stripe Only',
          'Hybrid',
          'Other'
        ]],
        msg: 'Invalid card type'
      }
    }
  },
  card_technology: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'e.g., EMV, MIFARE, DESFire'
  },

  // ==========================================
  // Batch Quantities
  // ==========================================
  planned_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  produced_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  accepted_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  rejected_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  scrap_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },

  // ==========================================
  // Production Timeline
  // ==========================================
  production_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expected_completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Production Process
  // ==========================================
  production_line: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  production_shift: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Shift during which production occurred'
  },
  machine_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  operator_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  supervisor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },

  // ==========================================
  // Status
  // ==========================================
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Planned',
    validate: {
      isIn: {
        args: [[
          'Planned',
          'In Production',
          'Completed',
          'On Hold',
          'Testing',
          'Approved',
          'Rejected',
          'Quarantined',
          'Released',
          'Cancelled'
        ]],
        msg: 'Invalid status'
      }
    }
  },
  quality_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['Pass', 'Fail', 'Pending', 'Conditional Pass', 'Re-test Required']],
        msg: 'Invalid quality status'
      }
    }
  },

  // ==========================================
  // Customer Information
  // ==========================================
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  customer_po: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Customer Purchase Order number'
  },
  customer_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // ==========================================
  // Component Traceability
  // ==========================================
  ic_module_batch: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'IC Module batch/lot number'
  },
  card_body_batch: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Card body/laminate batch number'
  },
  antenna_batch: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Antenna batch number (for contactless)'
  },
  component_batches: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional component batch numbers'
  },

  // ==========================================
  // Quality Control
  // ==========================================
  inspection_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  inspection_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  qc_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  qc_approval_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  qc_approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },

  // ==========================================
  // Test Results Summary
  // ==========================================
  tests_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tests_passed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tests_failed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  test_completion_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100
    }
  },

  // ==========================================
  // Storage and Location
  // ==========================================
  storage_location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  warehouse_location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_quarantined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  quarantine_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quarantine_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Release Information
  // ==========================================
  release_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  released_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  release_certificate_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // ==========================================
  // Expiry and Shelf Life
  // ==========================================
  manufacture_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  shelf_life_months: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // ==========================================
  // Notes and Comments
  // ==========================================
  production_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quality_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Metadata
  // ==========================================
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'card_batches',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['batch_number'],
      unique: true
    },
    {
      fields: ['facility_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['quality_status']
    },
    {
      fields: ['production_date']
    },
    {
      fields: ['card_type']
    },
    {
      fields: ['operator_id']
    },
    {
      fields: ['customer_name']
    },
    {
      fields: ['is_quarantined']
    }
  ]
});

// Instance methods
CardBatch.prototype.isCompleted = function() {
  return this.status === 'Completed' || this.status === 'Released';
};

CardBatch.prototype.isQuarantined = function() {
  return this.is_quarantined === true;
};

CardBatch.prototype.isApproved = function() {
  return this.qc_approved === true;
};

CardBatch.prototype.getYieldPercentage = function() {
  if (!this.produced_quantity || this.produced_quantity === 0) return 0;
  if (!this.accepted_quantity) return 0;
  return (this.accepted_quantity / this.produced_quantity) * 100;
};

CardBatch.prototype.getDefectRate = function() {
  if (!this.produced_quantity || this.produced_quantity === 0) return 0;
  if (!this.rejected_quantity) return 0;
  return (this.rejected_quantity / this.produced_quantity) * 100;
};

CardBatch.prototype.isExpired = function() {
  if (!this.expiry_date) return false;
  const expiryDate = new Date(this.expiry_date);
  const today = new Date();
  return today > expiryDate;
};

module.exports = CardBatch;

