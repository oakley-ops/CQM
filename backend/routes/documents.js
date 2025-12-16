const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentController');
const { protect: authenticate } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/documents'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDFs, Excel files, and common document formats
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv',
    'image/png',
    'image/jpeg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Excel, Word, CSV, and images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * @swagger
 * /api/projects/{projectId}/documents:
 *   get:
 *     summary: Get all documents for a project
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: document_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get('/projects/:projectId/documents', authenticate, documentController.getProjectDocuments);

/**
 * @swagger
 * /api/projects/{projectId}/documents/stats:
 *   get:
 *     summary: Get document statistics for a project
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document statistics
 */
router.get('/projects/:projectId/documents/stats', authenticate, documentController.getDocumentStats);

/**
 * @swagger
 * /api/projects/{projectId}/documents/upload:
 *   post:
 *     summary: Upload a document to a project
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               document_name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 */
router.post('/projects/:projectId/documents/upload', authenticate, upload.single('file'), documentController.uploadDocument);

/**
 * @swagger
 * /api/projects/{projectId}/documents/import-google-sheet:
 *   post:
 *     summary: Import a Google Sheet as a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - google_sheet_url
 *             properties:
 *               google_sheet_url:
 *                 type: string
 *               document_name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               sheet_range:
 *                 type: string
 *     responses:
 *       201:
 *         description: Google Sheet imported successfully
 */
router.post('/projects/:projectId/documents/import-google-sheet', authenticate, documentController.importFromGoogleSheets);

/**
 * @swagger
 * /api/projects/{projectId}/documents/bulk-download:
 *   post:
 *     summary: Download multiple documents as a ZIP file
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentIds
 *             properties:
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: ZIP file with documents
 */
router.post('/projects/:projectId/documents/bulk-download', authenticate, documentController.bulkDownload);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Get a specific document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document details
 */
router.get('/documents/:documentId', authenticate, documentController.getDocument);

/**
 * @swagger
 * /api/documents/{documentId}/download:
 *   get:
 *     summary: Download a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File download
 */
router.get('/documents/:documentId/download', authenticate, documentController.downloadDocument);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   put:
 *     summary: Update document metadata
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               document_name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Document updated successfully
 */
router.put('/documents/:documentId', authenticate, documentController.updateDocument);

/**
 * @swagger
 * /api/documents/{documentId}/archive:
 *   patch:
 *     summary: Archive or unarchive a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - archived
 *             properties:
 *               archived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document archived/unarchived successfully
 */
router.patch('/documents/:documentId/archive', authenticate, documentController.archiveDocument);

/**
 * @swagger
 * /api/documents/{documentId}/export-google-sheet:
 *   post:
 *     summary: Export a document to Google Sheets
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sheet_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document exported to Google Sheets successfully
 */
router.post('/documents/:documentId/export-google-sheet', authenticate, documentController.exportToGoogleSheets);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document deleted successfully
 */
router.delete('/documents/:documentId', authenticate, documentController.deleteDocument);

module.exports = router;
