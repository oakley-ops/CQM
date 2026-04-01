-- Create sample_cards table
CREATE TABLE IF NOT EXISTS sample_cards (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  card_number INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, card_number)
);

-- Add sample_card_id to test_entries
ALTER TABLE test_entries ADD COLUMN IF NOT EXISTS sample_card_id INTEGER REFERENCES sample_cards(id) ON DELETE CASCADE;

-- Drop old unique constraint (named test_entries_session_id_test_definition_id_key)
ALTER TABLE test_entries DROP CONSTRAINT IF EXISTS test_entries_session_id_test_definition_id_key;

-- Partial unique index for session-level entries (no sample card)
CREATE UNIQUE INDEX IF NOT EXISTS test_entries_session_def_null_card
  ON test_entries(session_id, test_definition_id)
  WHERE sample_card_id IS NULL;

-- Unique index for per-card entries
CREATE UNIQUE INDEX IF NOT EXISTS test_entries_card_def
  ON test_entries(sample_card_id, test_definition_id)
  WHERE sample_card_id IS NOT NULL;
