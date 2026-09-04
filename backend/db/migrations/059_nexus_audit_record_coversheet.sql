-- NEXUS: reconcile nexus_audit_records field names with the frontend, and add the
-- remaining cqmAP V3.A Coversheet fields.

-- 1) Reconcile names the UI already edits (the model/UI used auditor_name & notes,
--    while the table had `auditor` & `general_notes`). Guarded so re-runs are safe.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'nexus_audit_records' AND column_name = 'auditor') THEN
    ALTER TABLE nexus_audit_records RENAME COLUMN auditor TO auditor_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'nexus_audit_records' AND column_name = 'general_notes') THEN
    ALTER TABLE nexus_audit_records RENAME COLUMN general_notes TO notes;
  END IF;
END $$;

-- 2) Columns the UI already edits but the table lacked
ALTER TABLE nexus_audit_records ADD COLUMN IF NOT EXISTS site_code       VARCHAR(50);
ALTER TABLE nexus_audit_records ADD COLUMN IF NOT EXISTS address         VARCHAR(255);
ALTER TABLE nexus_audit_records ADD COLUMN IF NOT EXISTS country         VARCHAR(100);
ALTER TABLE nexus_audit_records ADD COLUMN IF NOT EXISTS auditor_company VARCHAR(255);

-- Backfill the new flat address/country from the legacy structured columns
UPDATE nexus_audit_records SET address = address_line1 WHERE address IS NULL AND address_line1 IS NOT NULL;
UPDATE nexus_audit_records SET country = country_code  WHERE country IS NULL AND country_code  IS NOT NULL;

-- 3) New cqmAP V3.A Coversheet fields
ALTER TABLE nexus_audit_records
  ADD COLUMN IF NOT EXISTS primary_contact_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_contact_email     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_contact_phone     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS audit_contact_name        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS audit_contact_email       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS audit_contact_phone       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS customer_id               VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cvcs_reference            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS staff_total               INTEGER,
  ADD COLUMN IF NOT EXISTS staff_in_production       INTEGER,
  ADD COLUMN IF NOT EXISTS auditor_email             VARCHAR(255),
  ADD COLUMN IF NOT EXISTS auditor_phone             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS previous_audit_type       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS previous_audit_rank       CHAR(1),
  ADD COLUMN IF NOT EXISTS strengths                 TEXT,
  ADD COLUMN IF NOT EXISTS weaknesses                TEXT,
  ADD COLUMN IF NOT EXISTS improvements              TEXT,
  ADD COLUMN IF NOT EXISTS regressions               TEXT,
  ADD COLUMN IF NOT EXISTS next_audit_remote_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_volumes        JSONB   NOT NULL DEFAULT '{}'::jsonb;

-- 4) Constraints for the new enum-like fields (drop-then-add for idempotency)
ALTER TABLE nexus_audit_records DROP CONSTRAINT IF EXISTS nexus_audit_records_prev_type_check;
ALTER TABLE nexus_audit_records ADD  CONSTRAINT nexus_audit_records_prev_type_check
  CHECK (previous_audit_type IS NULL OR previous_audit_type IN ('on-site', 'remote'));

ALTER TABLE nexus_audit_records DROP CONSTRAINT IF EXISTS nexus_audit_records_prev_rank_check;
ALTER TABLE nexus_audit_records ADD  CONSTRAINT nexus_audit_records_prev_rank_check
  CHECK (previous_audit_rank IS NULL OR previous_audit_rank IN ('A', 'B', 'C', 'D'));
