const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ManufacturingFacility Model (formerly Project)
 * Represents a smart card manufacturing facility with CQM certification tracking
 */
const ManufacturingFacility = sequelize.define('ManufacturingFacility', {
  // Primary Key
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },

  // ==========================================
  // Basic Information (from original Project)
  // ==========================================
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Facility name is required'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Location Information
  // ==========================================
  country_code: {
    type: DataTypes.CHAR(2),
    allowNull: true,
    comment: 'ISO 3166-1 alpha-2 country code'
  },
  country_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  location_code: {
    type: DataTypes.STRING(2),
    allowNull: true,
    comment: 'Internal location code for facility identification'
  },
  facility_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Unique facility identifier code'
  },

  // ==========================================
  // Technology & Capabilities
  // ==========================================
  technology_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: {
        args: [['Contact', 'Dual', 'Contactless']],
        msg: 'Technology type must be Contact, Dual, or Contactless'
      }
    },
    comment: 'Primary card technology manufactured'
  },
  manufacturing_capabilities: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'Array of capabilities: IC Manufacturing, IC Module Production, Inlay Assembly, Card Production, Chip Embedding, Personalization'
  },
  production_capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Production capacity in cards per day'
  },

  // ==========================================
  // CQM Label Structure (ACCLLTTTTS)
  // ==========================================
  cqm_label: {
    type: DataTypes.STRING(11),
    allowNull: true,
    unique: true,
    validate: {
      len: {
        args: [11, 11],
        msg: 'CQM label must be exactly 11 characters (ACCLLTTTTS format)'
      }
    },
    comment: 'CQM Label Format: ACCLLTTTTS (e.g., A0001C0001A)'
  },
  label_country_code: {
    type: DataTypes.CHAR(2),
    allowNull: true,
    comment: 'CC component of CQM label'
  },
  label_location_code: {
    type: DataTypes.STRING(2),
    allowNull: true,
    comment: 'LL component of CQM label'
  },
  label_technology: {
    type: DataTypes.STRING(4),
    allowNull: true,
    comment: 'TTTT component: C=Contact, D=Dual, L=Contactless'
  },
  label_status: {
    type: DataTypes.CHAR(1),
    allowNull: true,
    validate: {
      isIn: {
        args: [['R', 'A']],
        msg: 'Label status must be R (Recognition) or A (Approval)'
      }
    },
    comment: 'S component: R=Recognition, A=Approval'
  },

  // ==========================================
  // Certification Status
  // ==========================================
  certification_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Not Certified',
    validate: {
      isIn: {
        args: [['Not Certified', 'In Process', 'Certified', 'Suspended', 'Expired']],
        msg: 'Invalid certification status'
      }
    }
  },
  certificate_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  certificate_issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  certificate_expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Audit Information
  // ==========================================
  last_audit_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  next_audit_due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  audit_frequency_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 24,
    comment: 'Audit frequency: typically 12, 18, or 24 months'
  },

  // ==========================================
  // Letter of Approval (LoA)
  // ==========================================
  loa_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Letter of Approval status: Active, Pending, Expired'
  },
  loa_reference_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  loa_issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },

  // ==========================================
  // Contact Information
  // ==========================================
  facility_manager_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  facility_manager_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      }
    }
  },
  quality_manager_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  quality_manager_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      }
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  // ==========================================
  // Additional Details
  // ==========================================
  iso_certifications: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'Array of ISO certifications: ISO 9001, ISO 14001, etc.'
  },
  established_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  employee_count: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // ==========================================
  // Legacy Fields (kept for compatibility)
  // ==========================================
  status: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Active',
    comment: 'Facility operational status'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Facility operation start date'
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Facility operation end date (if closed)'
  },
  project_manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Legacy field - now represents facility administrator'
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Annual budget or certification costs'
  },
  progress: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'Legacy field - can represent certification progress'
  }
}, {
  tableName: 'manufacturing_facilities',
  timestamps: true,
  underscored: false,
  indexes: [
    {
      name: 'idx_facilities_country',
      fields: ['country_code']
    },
    {
      name: 'idx_facilities_tech',
      fields: ['technology_type']
    },
    {
      name: 'idx_facilities_cert_status',
      fields: ['certification_status']
    },
    {
      name: 'idx_facilities_cqm_label',
      fields: ['cqm_label']
    },
    {
      name: 'idx_facilities_expiry',
      fields: ['certificate_expiry_date']
    }
  ]
});

// Virtual fields for computed properties
ManufacturingFacility.prototype.isCertified = function() {
  return this.certification_status === 'Certified';
};

ManufacturingFacility.prototype.isCertificateExpiringSoon = function(daysThreshold = 90) {
  if (!this.certificate_expiry_date) return false;
  const expiryDate = new Date(this.certificate_expiry_date);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
};

ManufacturingFacility.prototype.isAuditDue = function(daysThreshold = 30) {
  if (!this.next_audit_due_date) return false;
  const auditDate = new Date(this.next_audit_due_date);
  const today = new Date();
  const daysUntilAudit = Math.ceil((auditDate - today) / (1000 * 60 * 60 * 24));
  return daysUntilAudit <= daysThreshold;
};

module.exports = ManufacturingFacility;

