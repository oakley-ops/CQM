-- NEXUS: Compliance watchdog alerts
CREATE TABLE IF NOT EXISTS nexus_alerts (
  id               SERIAL PRIMARY KEY,
  audit_record_id  INTEGER REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  alert_type       VARCHAR(50) NOT NULL,    -- overdue-capa / nc-no-capa / low-qms-score / gate-fail / spc-ooc / audit-approaching / no-monitoring
  severity         VARCHAR(10) NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title            VARCHAR(255) NOT NULL,
  message          TEXT NOT NULL,
  action_required  TEXT,                    -- what the user should do
  requirement_id   VARCHAR(10),             -- #XXXX# if applicable
  entity_type      VARCHAR(50),             -- capa_item / qms_assessment / product_scope / test_session
  entity_id        INTEGER,
  is_read          BOOLEAN NOT NULL DEFAULT false,
  is_dismissed     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_alerts_audit     ON nexus_alerts(audit_record_id);
CREATE INDEX IF NOT EXISTS idx_nexus_alerts_severity  ON nexus_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_nexus_alerts_read      ON nexus_alerts(is_read, is_dismissed);
