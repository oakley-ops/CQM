-- Migration 012: Add pdf_pages column to test_entry_metadata
-- Stores base64 PNG pages rendered from imported peel strength PDFs.
-- Used exclusively by the OverlayPeel form; populated via the dedicated
-- POST /api/test-entries/metadata/pdf-pages endpoint (never via the
-- general upsertEntryMetadata endpoint, keeping normal saves lightweight).

ALTER TABLE test_entry_metadata
  ADD COLUMN IF NOT EXISTS pdf_pages JSONB DEFAULT NULL;
