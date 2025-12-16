const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Component Model
 * Tracks components used in card production (IC modules, card bodies, antennas, etc.)
 */
const Component = sequelize.define('Component', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // ==========================================
  // Component Identification
  // ==========================================
  component_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique component code/SKU'
  },
  component_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Component name is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Component Classification
  // ==========================================
  component_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isIn: {
        args: [[
          'IC Module',
          'Card Body/Laminate',
          'Antenna',
          'Chip',
          'Overlay',
          'Hologram',
          'Magnetic Stripe',
          'Inlay',
          'Raw Material',
          'Consumable',
          'Other'
        ]],
        msg: 'Invalid component type'
      }
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Sub-category or classification'
  },

  // ==========================================
  // Supplier Information
  // ==========================================
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  supplier_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  supplier_part_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  manufacturer_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  manufacturer_part_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // ==========================================
  // Specifications
  // ==========================================
  specifications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  technical_datasheet_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  compliance_standards: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'ISO/IEC standards compliance (e.g., ISO 7816-2)'
  },

  // ==========================================
  // Quality Requirements
  // ==========================================
  quality_grade: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Quality grade (e.g., Grade A, Industrial, Automotive)'
  },
  certification_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  certifications: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'Required certifications'
  },
  approval_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pending Approval',
    validate: {
      isIn: {
        args: [['Approved', 'Pending Approval', 'Rejected', 'Obsolete']],
        msg: 'Invalid approval status'
      }
    }
  },
  approved_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },

  // ==========================================
  // Inventory Management
  // ==========================================
  unit_of_measure: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit (e.g., pcs, kg, meters, boxes)'
  },
  unit_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'USD'
  },
  minimum_order_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  lead_time_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Lead time in days'
  },

  // ==========================================
  // Stock Levels
  // ==========================================
  current_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  minimum_stock_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reorder point'
  },
  maximum_stock_level: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reorder_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // ==========================================
  // Storage Requirements
  // ==========================================
  storage_conditions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Storage temperature, humidity, etc.'
  },
  storage_location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  shelf_life_months: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  special_handling_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  handling_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Batch/Lot Tracking
  // ==========================================
  requires_lot_tracking: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  current_lot_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  lot_expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Inspection Requirements
  // ==========================================
  incoming_inspection_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  inspection_procedure: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sampling_plan: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  acceptance_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Risk and Criticality
  // ==========================================
  is_critical: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Is this a critical component?'
  },
  risk_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['Critical', 'High', 'Medium', 'Low']],
        msg: 'Invalid risk level'
      }
    }
  },
  alternative_components: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'Alternative/substitute component codes'
  },

  // ==========================================
  // Environmental and Safety
  // ==========================================
  is_hazardous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  safety_datasheet_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rohs_compliant: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'RoHS (Restriction of Hazardous Substances) compliance'
  },
  reach_compliant: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'REACH compliance'
  },

  // ==========================================
  // Status
  // ==========================================
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Active',
    validate: {
      isIn: {
        args: [['Active', 'Inactive', 'Obsolete', 'Discontinued', 'Phase Out']],
        msg: 'Invalid status'
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  discontinuation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  replacement_component_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'components',
      key: 'id'
    },
    comment: 'Replacement component when discontinued'
  },

  // ==========================================
  // Additional Information
  // ==========================================
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  internal_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'URLs to attachments (specs, certs, etc.)'
  },

  // ==========================================
  // Metadata
  // ==========================================
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  custom_fields: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'components',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['component_code'],
      unique: true
    },
    {
      fields: ['component_type']
    },
    {
      fields: ['supplier_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['approval_status']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_critical']
    }
  ]
});

// Instance methods
Component.prototype.isActive = function() {
  return this.is_active === true && this.status === 'Active';
};

Component.prototype.isApproved = function() {
  return this.approval_status === 'Approved';
};

Component.prototype.isCritical = function() {
  return this.is_critical === true;
};

Component.prototype.needsReorder = function() {
  if (!this.minimum_stock_level) return false;
  return this.current_stock <= this.minimum_stock_level;
};

Component.prototype.isLotExpired = function() {
  if (!this.lot_expiry_date) return false;
  const expiryDate = new Date(this.lot_expiry_date);
  const today = new Date();
  return today > expiryDate;
};

module.exports = Component;

