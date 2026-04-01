-- Test-level metadata for specialized test forms (warpage, solidity, adhesion, etc.)
-- One row per (session, test_definition) — stores header fields that apply to the whole test,
-- not repeated per sample card.
CREATE TABLE IF NOT EXISTS test_entry_metadata (
  id                       SERIAL PRIMARY KEY,
  session_id               INTEGER NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  test_definition_id       INTEGER NOT NULL REFERENCES test_definitions(id) ON DELETE CASCADE,
  sampled_by               VARCHAR(200),
  technician               VARCHAR(200),
  test_time                TIME,
  temperature_c            DECIMAL(5,2),
  humidity_pct             DECIMAL(5,2),
  calibration_verified     BOOLEAN,
  calibration_valid_until  DATE,
  env_logger_id            VARCHAR(100),
  cal_valid_until          DATE,
  sample_preconditioned    BOOLEAN,
  job_notes                TEXT,
  extra_data               JSONB,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, test_definition_id)
);
