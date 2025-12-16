const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * QmsDocument Model (formerly ProjectDocument)
 * Represents Quality Management System documents with version control
 */
const QmsDocument = sequelize.define('QmsDocument', {
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
    },
    onDelete: 'CASCADE'
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },

  // ==========================================
  // Document Identification
  // ==========================================
  document_reference: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique document reference number'
  },
  document_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Document name is required'
      }
    }
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },

  // ==========================================
  // File Information
  // ==========================================
  file_path: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  checksum: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'SHA-256 checksum for file integrity'
  },

  // ==========================================
  // CQM Document Classification
  // ==========================================
  document_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isIn: {
        args: [[
          'quality_policy',
          'quality_manual',
          'procedure',
          'work_instruction',
          'test_specification',
          'audit_report',
          'capa_document',
          'training_material',
          'iso_standard',
          'certificate',
          'supplier_agreement',
          'production_record',
          'inspection_record',
          'calibration_record',
          'management_review',
          'risk_assessment',
          'other'
        ]],
        msg: 'Invalid document type'
      }
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [[
          'qms',
          'audit',
          'compliance',
          'training',
          'production',
          'testing',
          'certification',
          'supplier',
          'other'
        ]],
        msg: 'Invalid category'
      }
    }
  },
  iso_standard_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Related ISO standard (e.g., ISO 7810)'
  },

  // ==========================================
  // Version Control
  // ==========================================
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '1.0',
    comment: 'Version number (e.g., 1.0, 1.1, 2.0)'
  },
  version_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  parent_document_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'qms_documents',
      key: 'id'
    },
    onDelete: 'SET NULL',
    comment: 'Previous version of this document'
  },
  is_latest_version: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  revision_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // ==========================================
  // Approval Workflow
  // ==========================================
  approval_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Draft',
    validate: {
      isIn: {
        args: [['Draft', 'Under Review', 'Approved', 'Superseded', 'Obsolete', 'Rejected']],
        msg: 'Invalid approval status'
      }
    }
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  review_date: {
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
  approval_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  approved_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  approval_signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Digital signature or approval reference'
  },

  // ==========================================
  // Document Validity
  // ==========================================
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  next_review_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  review_frequency_months: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    },
    comment: 'Review frequency in months'
  },

  // ==========================================
  // Access Control
  // ==========================================
  confidentiality_level: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Internal',
    validate: {
      isIn: {
        args: [['Public', 'Internal', 'Confidential', 'Restricted']],
        msg: 'Invalid confidentiality level'
      }
    }
  },
  access_roles: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: [],
    comment: 'Roles allowed to access this document'
  },

  // ==========================================
  // Document Content
  // ==========================================
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scope: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: []
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: []
  },

  // ==========================================
  // Document Status
  // ==========================================
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_controlled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Is this a controlled document requiring formal change management?'
  },
  is_printed_copy_uncontrolled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  // ==========================================
  // Additional References
  // ==========================================
  related_audit_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'audits',
      key: 'id'
    }
  },
  related_nc_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'non_conformities',
      key: 'id'
    }
  },
  related_capa_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'capa_actions',
      key: 'id'
    }
  },

  // ==========================================
  // External Links
  // ==========================================
  google_sheet_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  google_sheet_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  external_url: {
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
  },
  custom_fields: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },

  // Notes
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'qms_documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['facility_id']
    },
    {
      fields: ['uploaded_by']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['category']
    },
    {
      fields: ['approval_status']
    },
    {
      fields: ['is_archived']
    },
    {
      fields: ['is_latest_version']
    },
    {
      fields: ['document_reference'],
      unique: true
    },
    {
      fields: ['effective_date']
    },
    {
      fields: ['expiry_date']
    },
    {
      fields: ['next_review_date']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
QmsDocument.prototype.isApproved = function() {
  return this.approval_status === 'Approved';
};

QmsDocument.prototype.isExpired = function() {
  if (!this.expiry_date) return false;
  const expiryDate = new Date(this.expiry_date);
  const today = new Date();
  return today > expiryDate;
};

QmsDocument.prototype.isDueForReview = function() {
  if (!this.next_review_date) return false;
  const reviewDate = new Date(this.next_review_date);
  const today = new Date();
  return today >= reviewDate;
};

QmsDocument.prototype.getDaysUntilExpiry = function() {
  if (!this.expiry_date) return null;
  const expiryDate = new Date(this.expiry_date);
  const today = new Date();
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

QmsDocument.prototype.isControlled = function() {
  return this.is_controlled === true;
};

module.exports = QmsDocument;

