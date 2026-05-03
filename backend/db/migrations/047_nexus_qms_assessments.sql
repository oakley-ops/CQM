-- NEXUS: QMS requirement assessments (31 or 60 rows seeded per AuditRecord)
CREATE TABLE IF NOT EXISTS nexus_qms_assessments (
  id                  SERIAL PRIMARY KEY,
  audit_record_id     INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  requirement_id      VARCHAR(10) NOT NULL,   -- e.g. #0211#
  section             VARCHAR(30),            -- e.g. 4.5.1.1
  title               TEXT NOT NULL,
  iso_9001_coverage   VARCHAR(50),            -- ISO only / Nothing / etc.
  vendor_compliance   VARCHAR(30) DEFAULT 'tbd'
                      CHECK (vendor_compliance IN ('Yes','Procedure only','Practice only','No','tbd','n/a')),
  vendor_evidence_ref TEXT,
  conformity          VARCHAR(30) DEFAULT 'tbd'
                      CHECK (conformity IN ('NC+','nc-','RI','Full','NCC','tbd','n/a',
                             'NC+ (Subcontractor)','nc- (Subcontractor)','RI (Subcontractor)',
                             'Full (Subcontractor)','NCC (Subcontractor)',
                             'Not assessed (timing constraints)','Not assessed (Subcontractor)')),
  auditor_comment     TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (audit_record_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_nexus_qms_audit ON nexus_qms_assessments(audit_record_id);
CREATE INDEX IF NOT EXISTS idx_nexus_qms_conformity ON nexus_qms_assessments(conformity);
