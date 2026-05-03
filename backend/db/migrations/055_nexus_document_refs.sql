-- NEXUS: Document evidence register (mirrors Docs sheet)
CREATE TABLE IF NOT EXISTS nexus_document_refs (
  id               SERIAL PRIMARY KEY,
  audit_record_id  INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  requirement_id   VARCHAR(10),    -- #XXXX# this document supports
  doc_id           VARCHAR(50),    -- vendor's document ID/number
  title            TEXT NOT NULL,
  doc_type         VARCHAR(50),    -- Policy / Procedure / Work Instruction / Record / Other
  version          VARCHAR(20),
  notes            TEXT,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_docs_audit ON nexus_document_refs(audit_record_id);
CREATE INDEX IF NOT EXISTS idx_nexus_docs_req   ON nexus_document_refs(requirement_id);
