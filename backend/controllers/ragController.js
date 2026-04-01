const fs = require('fs');
const path = require('path');
const { RagDocument } = require('../models');
const ragService = require('../services/ragService');
const logger = require('../utils/logger');

// ── GET /api/rag/documents ────────────────────────────────────────────────────
exports.listDocuments = async (req, res) => {
  try {
    const docs = await RagDocument.findAll({
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['file_path', 'vector_store_path'] },
    });
    res.json({ success: true, data: docs });
  } catch (err) {
    logger.error('RAG listDocuments error:', err);
    res.status(500).json({ success: false, message: 'Failed to list documents' });
  }
};

// ── POST /api/rag/documents — upload + async ingest ───────────────────────────
exports.uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
  }

  const name = (req.body.name || '').trim() || req.file.originalname.replace(/\.pdf$/i, '');

  let doc;
  try {
    doc = await RagDocument.create({
      name,
      filename: req.file.originalname,
      file_path: req.file.path,
      status: 'pending',
      ingested_by: req.user.id,
    });
  } catch (err) {
    logger.error('RAG create document record error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create document record' });
  }

  // Return immediately — ingestion runs in background
  res.status(202).json({ success: true, data: doc, message: 'Document uploaded. Ingestion started.' });

  // Async ingestion
  (async () => {
    try {
      const { chunkCount, vectorStorePath } = await ragService.ingestDocument(
        req.file.path,
        doc.id,
        name,
      );
      await doc.update({
        status: 'ready',
        chunk_count: chunkCount,
        vector_store_path: vectorStorePath,
        ingested_at: new Date(),
        error_message: null,
      });
      logger.info(`RAG: document ${doc.id} ("${name}") ingested — ${chunkCount} chunks`);
    } catch (err) {
      logger.error(`RAG ingestion failed for doc ${doc.id}:`, err);
      await doc.update({ status: 'error', error_message: err.message });
    }
  })();
};

// ── DELETE /api/rag/documents/:id ─────────────────────────────────────────────
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await RagDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Remove PDF file
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
    // Remove vector store directory
    if (doc.vector_store_path && fs.existsSync(doc.vector_store_path)) {
      fs.rmSync(doc.vector_store_path, { recursive: true, force: true });
    }
    ragService.invalidateCache(doc.id);

    await doc.destroy();
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    logger.error('RAG deleteDocument error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};

// ── POST /api/rag/query — sync ────────────────────────────────────────────────
exports.query = async (req, res) => {
  const { question, contextHint } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'question is required' });
  }

  try {
    const readyDocs = await RagDocument.findAll({ where: { status: 'ready' }, attributes: ['id'] });
    const readyDocIds = readyDocs.map((d) => d.id);
    const answer = await ragService.queryAll(question.trim(), readyDocIds, contextHint);
    res.json({ success: true, answer });
  } catch (err) {
    logger.error('RAG query error:', err);
    res.status(500).json({ success: false, message: 'Query failed', error: err.message });
  }
};

// ── POST /api/rag/query/stream — Server-Sent Events streaming ─────────────────
exports.queryStream = async (req, res) => {
  const { question, contextHint } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'question is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const readyDocs = await RagDocument.findAll({ where: { status: 'ready' }, attributes: ['id'] });
    const readyDocIds = readyDocs.map((d) => d.id);

    await ragService.queryStream(
      question.trim(),
      readyDocIds,
      contextHint,
      (chunk) => send({ type: 'chunk', text: chunk }),
    );

    send({ type: 'done' });
  } catch (err) {
    logger.error('RAG stream error:', err);
    send({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
};
