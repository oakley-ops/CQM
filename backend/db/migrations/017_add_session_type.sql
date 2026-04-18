-- Migration: Add session_type to test_sessions
-- Distinguishes Qualification (one-time product verification) from Monitoring (ongoing production checks)

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) NOT NULL DEFAULT 'Monitoring';

-- Backfill existing rows from batch number prefix convention
UPDATE test_sessions SET session_type = 'Qualification' WHERE batch_lot_number ILIKE 'QUA-%';
UPDATE test_sessions SET session_type = 'Monitoring'    WHERE batch_lot_number ILIKE 'MON-%';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_test_sessions_session_type ON test_sessions (session_type);
