-- Migration 011: Drop the over-broad unique index on test_entries
--
-- test_entries_session_id_test_definition_id is a UNIQUE INDEX (not a constraint)
-- on (session_id, test_definition_id) with no sample_card_id consideration.
-- This blocks per-card tests (e.g. OverlayPeel) from saving multiple rows for
-- the same test definition in one session — one row per section/card.
--
-- The two partial indexes already present handle uniqueness correctly:
--   test_entries_session_def_null_card  → UNIQUE(session_id, test_definition_id) WHERE sample_card_id IS NULL
--   test_entries_card_def               → UNIQUE(sample_card_id, test_definition_id) WHERE sample_card_id IS NOT NULL
--
-- Also drop the interim index added by migration 010 — it is superseded.

DROP INDEX IF EXISTS test_entries_session_id_test_definition_id;
DROP INDEX IF EXISTS test_entries_session_def_card_unique;
