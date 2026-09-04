-- NEXUS: cqmAP V3.A Coversheet fields the UI already edits but the table lacked.
-- Without these, saves from the Audit Detail page and Workbook Site Profile
-- chapter were silently dropped by Sequelize.
ALTER TABLE nexus_audit_records
  ADD COLUMN IF NOT EXISTS site_code                 VARCHAR(50),
  ADD COLUMN IF NOT EXISTS auditor_company           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS auditor_email             VARCHAR(255),
  ADD COLUMN IF NOT EXISTS auditor_phone             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_contact_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_contact_email     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_contact_phone     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS audit_contact_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS audit_contact_email       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS audit_contact_phone       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_id               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cvcs_reference            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS staff_total               INTEGER,
  ADD COLUMN IF NOT EXISTS staff_in_production       INTEGER,
  ADD COLUMN IF NOT EXISTS previous_audit_type       VARCHAR(50) CHECK (previous_audit_type IN ('on-site','remote')),
  ADD COLUMN IF NOT EXISTS previous_audit_rank       CHAR(1) CHECK (previous_audit_rank IN ('A','B','C','D')),
  ADD COLUMN IF NOT EXISTS next_audit_remote_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strengths                 TEXT,
  ADD COLUMN IF NOT EXISTS weaknesses                TEXT,
  ADD COLUMN IF NOT EXISTS improvements              TEXT,
  ADD COLUMN IF NOT EXISTS regressions               TEXT,
  ADD COLUMN IF NOT EXISTS production_volumes        JSONB NOT NULL DEFAULT '{}'::jsonb;
