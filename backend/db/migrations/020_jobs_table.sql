-- Migration 020: Add jobs table as first-class production order entity
-- Job Number is the primary tracking key; many test_sessions belong to one job

CREATE TABLE IF NOT EXISTS jobs (
  id                  SERIAL PRIMARY KEY,
  job_number          VARCHAR(100) NOT NULL UNIQUE,
  card_type           VARCHAR(50),
  status              VARCHAR(50) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  start_date          DATE,
  end_date            DATE,
  description         TEXT,
  customer_reference  VARCHAR(200),
  source_file         VARCHAR(100),
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_job_number ON jobs (job_number);
CREATE INDEX IF NOT EXISTS idx_jobs_status     ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_card_type  ON jobs (card_type);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs (start_date);

-- Link sessions to jobs
ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_test_sessions_job_id ON test_sessions (job_id);
