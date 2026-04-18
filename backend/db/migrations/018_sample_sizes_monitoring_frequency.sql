-- Migration: Add sample size requirements, monitoring frequency, and qualification validity to test_categories

ALTER TABLE test_categories
  ADD COLUMN IF NOT EXISTS qualification_sample_size INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS monitoring_sample_size     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monitoring_frequency_days  INTEGER,        -- NULL = no enforced frequency
  ADD COLUMN IF NOT EXISTS qualification_valid_months INTEGER;        -- NULL = never expires

COMMENT ON COLUMN test_categories.qualification_sample_size   IS 'Minimum number of sample cards required for a Qualification session';
COMMENT ON COLUMN test_categories.monitoring_sample_size      IS 'Minimum number of sample cards required for a Monitoring session';
COMMENT ON COLUMN test_categories.monitoring_frequency_days   IS 'Maximum days allowed between Monitoring sessions. NULL = no requirement.';
COMMENT ON COLUMN test_categories.qualification_valid_months  IS 'Months a Qualification approval remains valid. NULL = never expires.';
