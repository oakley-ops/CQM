const { ProjectDocument, Project, User } = require('../models');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');
const googleSheetsService = require('../utils/googleSheetsService');
const archiver = require('archiver');

/**
 * Document Controller
 * Handles document upload, download, and management for projects
 */

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../uploads/documents');
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

ensureUploadsDir();

/**
 * Upload document to project
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { document_name, category, description, tags } = req.body;
    const userId = req.user.id;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    
    // Determine document type based on mime type
    let documentType = 'other';
    if (file.mimetype === 'application/pdf') {
      documentType = 'pdf';
    } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) {
      documentType = 'excel';
    }

    // Extract metadata based on file type
    let metadata = {};
    
    if (documentType === 'pdf') {
      try {
        const dataBuffer = await fs.readFile(file.path);
        const pdfData = await pdfParse(dataBuffer);
        metadata = {
          pageCount: pdfData.numpages,
          text: pdfData.text.substring(0, 500), // First 500 chars for search
          info: pdfData.info
        };
      } catch (error) {
        console.error('Error parsing PDF:', error);
      }
    }

    // Create document record
    const document = await ProjectDocument.create({
      project_id: projectId,
      uploaded_by: userId,
      document_name: document_name || file.originalname,
      original_filename: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      document_type: documentType,
      category: category || 'other',
      description,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      metadata
    });

    // Load associations for response
    await document.reload({
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document', details: error.message });
  }
};

/**
 * Import from Google Sheets
 */
exports.importFromGoogleSheets = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { google_sheet_url, document_name, category, description, sheet_range } = req.body;
    const userId = req.user.id;

    // Verify project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if Google Sheets is initialized
    const isInitialized = await googleSheetsService.initialize();
    if (!isInitialized) {
      return res.status(503).json({ 
        error: 'Google Sheets integration is not configured',
        message: 'Please configure Google Sheets credentials to use this feature. See DOCUMENT_MANAGEMENT_SETUP.md for instructions.'
      });
    }

    // Extract spreadsheet ID from URL
    const spreadsheetId = googleSheetsService.extractSpreadsheetId(google_sheet_url);

    // Get spreadsheet info
    const sheetInfo = await googleSheetsService.getSpreadsheetInfo(spreadsheetId);

    // Import data from sheet
    const data = await googleSheetsService.importFromSheet(spreadsheetId, sheet_range);

    // Convert to Excel and save locally
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Imported Data');
    
    data.forEach(row => {
      worksheet.addRow(row);
    });

    const filename = `google_sheet_${spreadsheetId}_${Date.now()}.xlsx`;
    const filePath = path.join(UPLOADS_DIR, filename);
    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);

    // Create document record
    const document = await ProjectDocument.create({
      project_id: projectId,
      uploaded_by: userId,
      document_name: document_name || sheetInfo.title,
      original_filename: filename,
      file_path: filePath,
      file_size: stats.size,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      document_type: 'google_sheet',
      category: category || 'other',
      description,
      google_sheet_id: spreadsheetId,
      google_sheet_url: sheetInfo.url,
      metadata: {
        sheetInfo,
        rowCount: data.length,
        importedAt: new Date()
      }
    });

    await document.reload({
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: 'Google Sheet imported successfully',
      document,
      rowsImported: data.length
    });
  } catch (error) {
    console.error('Error importing from Google Sheets:', error);
    res.status(500).json({ error: 'Failed to import from Google Sheets', details: error.message });
  }
};

/**
 * Export document to Google Sheets
 */
exports.exportToGoogleSheets = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { sheet_name } = req.body;

    const document = await ProjectDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if Google Sheets is initialized
    const isInitialized = await googleSheetsService.initialize();
    if (!isInitialized) {
      return res.status(503).json({ 
        error: 'Google Sheets integration is not configured',
        message: 'Please configure Google Sheets credentials to use this feature. See DOCUMENT_MANAGEMENT_SETUP.md for instructions.'
      });
    }

    // Read Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(document.file_path);
    
    const worksheet = workbook.worksheets[0];
    const data = [];
    
    worksheet.eachRow((row, rowNumber) => {
      data.push(row.values.slice(1)); // Remove first empty element
    });

    // Export to Google Sheets
    const result = await googleSheetsService.exportToSheet(
      data,
      sheet_name || document.document_name,
      document.google_sheet_id
    );

    // Update document with Google Sheets info
    await document.update({
      google_sheet_id: result.spreadsheetId,
      google_sheet_url: result.url,
      metadata: {
        ...document.metadata,
        exportedToGoogleSheets: new Date(),
        googleSheetUrl: result.url
      }
    });

    res.json({
      message: 'Document exported to Google Sheets successfully',
      spreadsheetId: result.spreadsheetId,
      url: result.url
    });
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    res.status(500).json({ error: 'Failed to export to Google Sheets', details: error.message });
  }
};

/**
 * Get all documents for a project
 */
exports.getProjectDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { category, document_type, search, archived } = req.query;

    const where = { 
      project_id: projectId,
      is_archived: archived === 'true'
    };

    if (category) {
      where.category = category;
    }

    if (document_type) {
      where.document_type = document_type;
    }

    const documents = await ProjectDocument.findAll({
      where,
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    // Filter by search if provided
    let filteredDocuments = documents;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocuments = documents.filter(doc => 
        doc.document_name.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      documents: filteredDocuments,
      total: filteredDocuments.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
};

/**
 * Get document by ID
 */
exports.getDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await ProjectDocument.findByPk(documentId, {
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: ProjectDocument, as: 'versions' },
        { model: ProjectDocument, as: 'parentDocument' }
      ]
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document', details: error.message });
  }
};

/**
 * Download document
 */
exports.downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await ProjectDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists
    const fileExists = await fs.access(document.file_path)
      .then(() => true)
      .catch(() => false);

    if (!fileExists) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(document.file_path, document.original_filename);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document', details: error.message });
  }
};

/**
 * Update document metadata
 */
exports.updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { document_name, category, description, tags } = req.body;

    const document = await ProjectDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await document.update({
      document_name: document_name || document.document_name,
      category: category || document.category,
      description: description !== undefined ? description : document.description,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : document.tags
    });

    await document.reload({
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    res.json({
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document', details: error.message });
  }
};

/**
 * Archive/Unarchive document
 */
exports.archiveDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { archived } = req.body;

    const document = await ProjectDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await document.update({ is_archived: archived });

    res.json({
      message: `Document ${archived ? 'archived' : 'unarchived'} successfully`,
      document
    });
  } catch (error) {
    console.error('Error archiving document:', error);
    res.status(500).json({ error: 'Failed to archive document', details: error.message });
  }
};

/**
 * Delete document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await ProjectDocument.findByPk(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.file_path);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    await document.destroy();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
};

/**
 * Bulk download documents as ZIP
 */
exports.bulkDownload = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { documentIds } = req.body;

    const documents = await ProjectDocument.findAll({
      where: {
        id: documentIds,
        project_id: projectId
      }
    });

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found' });
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment(`project_${projectId}_documents.zip`);
    archive.pipe(res);

    // Add files to archive
    for (const doc of documents) {
      const fileExists = await fs.access(doc.file_path)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        archive.file(doc.file_path, { name: doc.original_filename });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error bulk downloading documents:', error);
    res.status(500).json({ error: 'Failed to download documents', details: error.message });
  }
};

/**
 * Get document statistics for a project
 */
exports.getDocumentStats = async (req, res) => {
  try {
    const { projectId } = req.params;

    const documents = await ProjectDocument.findAll({
      where: { project_id: projectId, is_archived: false }
    });

    const stats = {
      total: documents.length,
      byType: {},
      byCategory: {},
      totalSize: 0,
      recentUploads: []
    };

    documents.forEach(doc => {
      // Count by type
      stats.byType[doc.document_type] = (stats.byType[doc.document_type] || 0) + 1;
      
      // Count by category
      if (doc.category) {
        stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
      }
      
      // Sum file sizes
      stats.totalSize += parseInt(doc.file_size);
    });

    // Get recent uploads (last 5)
    stats.recentUploads = documents
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(doc => ({
        id: doc.id,
        name: doc.document_name,
        type: doc.document_type,
        uploaded_at: doc.created_at
      }));

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    res.status(500).json({ error: 'Failed to fetch document statistics', details: error.message });
  }
};
