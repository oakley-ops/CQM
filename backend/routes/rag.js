const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ragController = require('../controllers/ragController');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'rag-docs'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are accepted'));
  },
});

// All RAG routes require authentication
router.use(protect);

// Documents — admin only for write operations
router.get('/documents', ragController.listDocuments);
router.post('/documents', authorize('admin'), upload.single('file'), ragController.uploadDocument);
router.delete('/documents/:id', authorize('admin'), ragController.deleteDocument);

// Query — available to all authenticated users
router.post('/query', ragController.query);
router.post('/query/stream', ragController.queryStream);

module.exports = router;
