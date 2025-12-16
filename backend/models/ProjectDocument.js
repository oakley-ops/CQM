const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectDocument = sequelize.define('ProjectDocument', {
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
  document_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: {
        args: [['pdf', 'google_sheet', 'excel', 'invoice', 'po', 'contract', 'other']],
        msg: 'Invalid document type'
      }
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isIn: {
        args: [['invoice', 'purchase_order', 'contract', 'report', 'specification', 'meeting_minutes', 'other']],
        msg: 'Invalid category'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    defaultValue: []
  },
  google_sheet_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  google_sheet_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  parent_document_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'project_documents',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'project_documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['project_id']
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
      fields: ['is_archived']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = ProjectDocument;
