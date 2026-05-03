-- NEXUS: Top-level audit record (mirrors CQMAP V3.A Coversheet)
CREATE TABLE IF NOT EXISTS nexus_audit_records (
  id                  SERIAL PRIMARY KEY,
  site_name           VARCHAR(255) NOT NULL,
  company             VARCHAR(255) NOT NULL,
  address_line1       VARCHAR(255),
  address_line2       VARCHAR(255),
  city                VARCHAR(100),
  state_province      VARCHAR(100),
  postal_code         VARCHAR(20),
  country_code        CHAR(2),
  audit_date_start    DATE,
  audit_date_end      DATE,
  auditor             VARCHAR(255),
  audit_type          VARCHAR(50) CHECK (audit_type IN ('on-site','remote')),
  audit_scope         VARCHAR(50) CHECK (audit_scope IN ('initial','renewal')),
  iso_9001_certified  BOOLEAN NOT NULL DEFAULT false,
  grade               CHAR(1) CHECK (grade IN ('A','B','C','D')),
  status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','in-progress','submitted','closed')),
  cqmap_version       VARCHAR(20) DEFAULT 'V3.A',
  next_audit_date     DATE,
  report_date         DATE,
  general_notes       TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_audit_records_status ON nexus_audit_records(status);
CREATE INDEX IF NOT EXISTS idx_nexus_audit_records_grade  ON nexus_audit_records(grade);
