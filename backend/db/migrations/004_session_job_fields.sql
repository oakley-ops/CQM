-- Migration 004: Add job fields to test_sessions and make manufacturing_stage optional
-- Adds job_name, cat_number columns; removes NOT NULL constraint on manufacturing_stage

ALTER TABLE test_sessions
  ALTER COLUMN manufacturing_stage DROP NOT NULL;

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS job_name VARCHAR(200);

ALTER TABLE test_sessions
  ADD COLUMN IF NOT EXISTS cat_number VARCHAR(100);
