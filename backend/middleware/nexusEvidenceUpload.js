const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Disk-persisted PDF evidence attached to a NEXUS qualification checklist item
// (e.g. a FAT report). Mirrors routes/rag.js's disk-storage pattern; mimetype is
// checked here (cheap, spoofable), the real %PDF- magic-byte check happens in the
// controller once the file is written, since disk storage streams to disk and the
// full buffer isn't available inside fileFilter.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'nexus-evidence');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
});

const nexusEvidenceUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are accepted'));
  },
});

module.exports = { nexusEvidenceUpload, UPLOAD_DIR };
