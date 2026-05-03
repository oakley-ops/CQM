-- NEXUS: Per-product process step assessments (seeded from process-steps.json on ProductScope create)
CREATE TABLE IF NOT EXISTS nexus_process_step_assessments (
  id                       SERIAL PRIMARY KEY,
  product_scope_id         INTEGER NOT NULL REFERENCES nexus_product_scopes(id) ON DELETE CASCADE,
  process_tag              VARCHAR(20) NOT NULL,   -- e.g. #A00#
  process_name             TEXT NOT NULL,
  vendor_compliance        VARCHAR(30)
                           CHECK (vendor_compliance IN ('Yes','Procedure only','Practice only','No','tbd','n/a','Not applicable')),
  vendor_site              VARCHAR(255),           -- if outsourced, name of subcontractor site
  vendor_process_spec_ref  TEXT,
  vendor_control_plan_ref  TEXT,
  production_equipment     TEXT,
  test_equipment           TEXT,
  conformity               VARCHAR(30) NOT NULL DEFAULT 'tbd'
                           CHECK (conformity IN ('NC+','nc-','RI','Full','NCC','tbd','n/a',
                                  'NC+ (Subcontractor)','nc- (Subcontractor)','RI (Subcontractor)',
                                  'Full (Subcontractor)','NCC (Subcontractor)',
                                  'Not assessed (timing constraints)','Not assessed (Subcontractor)')),
  auditor_notes            TEXT,
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (product_scope_id, process_tag)
);

CREATE INDEX IF NOT EXISTS idx_nexus_psa_scope ON nexus_process_step_assessments(product_scope_id);
CREATE INDEX IF NOT EXISTS idx_nexus_psa_conformity ON nexus_process_step_assessments(conformity);
