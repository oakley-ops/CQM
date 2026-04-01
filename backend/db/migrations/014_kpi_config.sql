-- Migration 014: KPI configuration table
-- Stores target thresholds for quality KPIs shown on the dashboard.

CREATE TABLE IF NOT EXISTS kpi_config (
  id                SERIAL PRIMARY KEY,
  kpi_key           VARCHAR(100)    NOT NULL UNIQUE,
  kpi_name          VARCHAR(200)    NOT NULL,
  description       TEXT,
  target_value      DECIMAL(10,2)   NOT NULL,
  warning_threshold DECIMAL(10,2),
  unit              VARCHAR(50),
  higher_is_better  BOOLEAN         DEFAULT TRUE,
  is_active         BOOLEAN         DEFAULT TRUE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Seed default KPIs (idempotent)
INSERT INTO kpi_config (kpi_key, kpi_name, description, target_value, warning_threshold, unit, higher_is_better, created_at, updated_at)
VALUES
  ('overall_pass_rate', 'Overall Pass Rate',
   'Percentage of test entries that pass across all submitted & approved sessions',
   98, 95, '%', TRUE, NOW(), NOW()),

  ('first_pass_yield', 'First-Pass Yield',
   'Percentage of sessions where every test entry passes on the first submission',
   95, 90, '%', TRUE, NOW(), NOW()),

  ('pending_approval', 'Sessions Awaiting Approval',
   'Number of sessions currently in Submitted status waiting for QC approval',
   5, 10, 'sessions', FALSE, NOW(), NOW()),

  ('rejection_rate', 'Rejection Rate',
   'Percentage of finalised sessions that were rejected',
   2, 5, '%', FALSE, NOW(), NOW()),

  ('avg_days_to_approve', 'Avg Days to Approve',
   'Average calendar days from submission to approval (rolling 30 days)',
   2, 4, 'days', FALSE, NOW(), NOW())
ON CONFLICT (kpi_key) DO NOTHING;
