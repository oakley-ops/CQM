-- Migration 013: Add indexes on test_sessions for query performance
-- As session volume grows over time, these prevent full table scans on the
-- most common filter operations (history page: date range, status, card type).

CREATE INDEX IF NOT EXISTS idx_test_sessions_test_date
  ON test_sessions(test_date DESC);

CREATE INDEX IF NOT EXISTS idx_test_sessions_status
  ON test_sessions(status);

CREATE INDEX IF NOT EXISTS idx_test_sessions_card_type
  ON test_sessions(card_type);

CREATE INDEX IF NOT EXISTS idx_test_sessions_inspector_id
  ON test_sessions(inspector_id);

-- Composite index for the most common combined filter: status + date
CREATE INDEX IF NOT EXISTS idx_test_sessions_status_date
  ON test_sessions(status, test_date DESC);
