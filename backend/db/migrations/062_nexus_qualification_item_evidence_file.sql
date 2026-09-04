-- NEXUS: allow a PDF evidence file to be attached directly to a qualification checklist item
-- (e.g. the FAT report itself, not just a typed reference to it).
ALTER TABLE nexus_qualification_items
  ADD COLUMN IF NOT EXISTS evidence_file_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_file_path       TEXT,
  ADD COLUMN IF NOT EXISTS evidence_file_size       INTEGER,
  ADD COLUMN IF NOT EXISTS evidence_file_uploaded_at TIMESTAMPTZ;
