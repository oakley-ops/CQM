-- Migration 010: Fix test_entries unique constraint for per-card tests
--
-- The old constraint UNIQUE(session_id, test_definition_id) only allows one row
-- per test per session, which breaks per-card tests (e.g. OverlayPeel) that
-- produce multiple rows — one per section/card — for the same test definition.
--
-- Replace it with a functional unique index that:
--   • Still enforces one row per (session, definition) for session-level entries (sample_card_id IS NULL)
--   • Allows multiple rows per (session, definition) when they have distinct sample_card_ids
--
-- COALESCE(sample_card_id, -1) maps NULL → -1 so NULL values compare as equal,
-- keeping session-level entries (no card) deduplicated.

-- Drop the old constraint
ALTER TABLE test_entries
  DROP CONSTRAINT IF EXISTS test_entries_session_id_test_definition_id;

-- Add the new functional unique index
CREATE UNIQUE INDEX IF NOT EXISTS test_entries_session_def_card_unique
  ON test_entries (session_id, test_definition_id, COALESCE(sample_card_id, -1));
