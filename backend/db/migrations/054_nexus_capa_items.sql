-- NEXUS: Corrective Action Plan items (mirrors CAP sheet)
CREATE TABLE IF NOT EXISTS nexus_capa_items (
  id                    SERIAL PRIMARY KEY,
  audit_record_id       INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  action_id             VARCHAR(20) UNIQUE,   -- auto-generated: YY-MM/xxxNN e.g. 26-05/ABC01
  requirement_id        VARCHAR(10),          -- #XXXX# that raised this action
  source_type           VARCHAR(30) DEFAULT 'qms'
                        CHECK (source_type IN ('qms','process-step','manual')),
  source_entity_id      INTEGER,              -- id of QmsAssessment or ProcessStepAssessment
  severity              VARCHAR(10) NOT NULL
                        CHECK (severity IN ('NC+','nc-','RI')),
  observation           TEXT,
  suggested_action      TEXT,
  deadline              DATE,
  corrective_action     TEXT,
  target_date           DATE,
  responsibility        VARCHAR(255),
  status                VARCHAR(50) NOT NULL DEFAULT 'Not yet started'
                        CHECK (status IN (
                          'Not yet started','Ongoing','Complete','Cancelled',
                          'Finding Rejected','Completed check next audit','Replaced by new Action'
                        )),
  status_description    TEXT,
  evidence_ref          TEXT,
  auditor_review_status VARCHAR(20) DEFAULT 'Open'
                        CHECK (auditor_review_status IN ('Open','Completed','Cancelled')),
  auditor_comment       TEXT,
  created_by            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_capa_audit    ON nexus_capa_items(audit_record_id);
CREATE INDEX IF NOT EXISTS idx_nexus_capa_severity ON nexus_capa_items(severity);
CREATE INDEX IF NOT EXISTS idx_nexus_capa_status   ON nexus_capa_items(status);
CREATE INDEX IF NOT EXISTS idx_nexus_capa_deadline ON nexus_capa_items(deadline);
