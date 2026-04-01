-- Migration 015: RAG knowledge base documents table
-- Tracks PDFs uploaded and indexed for the CQM knowledge base chat feature.

CREATE TABLE IF NOT EXISTS rag_documents (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255)    NOT NULL,
  filename            VARCHAR(255)    NOT NULL,
  file_path           TEXT            NOT NULL,
  vector_store_path   TEXT,
  chunk_count         INTEGER         DEFAULT 0,
  status              VARCHAR(50)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'ready', 'error')),
  error_message       TEXT,
  ingested_by         INTEGER         REFERENCES users(id) ON DELETE SET NULL,
  ingested_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_status ON rag_documents(status);
