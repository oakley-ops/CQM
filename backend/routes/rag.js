const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { aiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const ragController = require('../controllers/ragController');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'rag-docs');

const uploadPDF = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are accepted'));
  },
});

const XLSX_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // some browsers send this for .xlsx
]);

const uploadXLSX = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isXlsxMime = XLSX_MIMETYPES.has(file.mimetype);
    const isXlsxExt  = /\.xlsx$/i.test(file.originalname);
    if (isXlsxMime || isXlsxExt) return cb(null, true);
    cb(new Error('Only .xlsx files are accepted for CQMAP upload'));
  },
});

// All RAG routes require authentication
router.use(protect);

// Documents — admin only for write operations
router.get('/documents', ragController.listDocuments);
router.post('/documents', authorize('admin'), uploadLimiter, uploadPDF.single('file'), ragController.uploadDocument);
router.post('/documents/cqmap', authorize('admin'), uploadLimiter, uploadXLSX.single('file'), ragController.uploadCQMAP);
router.delete('/documents/:id', authorize('admin'), ragController.deleteDocument);

// Query — available to all authenticated users, but rate-limited (paid LLM calls)
router.post('/query', aiLimiter, ragController.query);
router.post('/query/stream', aiLimiter, ragController.queryStream);

module.exports = router;
