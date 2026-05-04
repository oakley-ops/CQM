-- Migration 057: Autodata Pipeline Runs
-- Tracks multi-agent Claude tool-use pipeline executions

CREATE TABLE IF NOT EXISTS autodata_runs (
  id SERIAL PRIMARY KEY,
  run_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  config JSONB,
  stats JSONB,
  sample_count INTEGER,
  dataset_path VARCHAR(500),
  dataset_format VARCHAR(50) DEFAULT 'jsonl',
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autodata_runs_status ON autodata_runs(status);
CREATE INDEX IF NOT EXISTS idx_autodata_runs_created_by ON autodata_runs(created_by);
