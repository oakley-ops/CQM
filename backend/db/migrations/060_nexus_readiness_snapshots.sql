-- backend/db/migrations/060_nexus_readiness_snapshots.sql
-- One row per readiness computation whose numbers changed; powers the
-- dry-run -> fix -> re-check trend in the Assessment Workbook.
CREATE TABLE IF NOT EXISTS nexus_readiness_snapshots (
  id SERIAL PRIMARY KEY,
  audit_record_id INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,            -- { qms: {...summary}, categories: [...], blockerCount }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_audit
  ON nexus_readiness_snapshots (audit_record_id, created_at DESC);
