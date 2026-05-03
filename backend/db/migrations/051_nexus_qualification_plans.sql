-- NEXUS: Per-product qualification plans (links Job + ProductScope)
CREATE TABLE IF NOT EXISTS nexus_qualification_plans (
  id               SERIAL PRIMARY KEY,
  audit_record_id  INTEGER REFERENCES nexus_audit_records(id) ON DELETE SET NULL,
  product_scope_id INTEGER REFERENCES nexus_product_scopes(id) ON DELETE SET NULL,
  job_id           INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  plan_type        VARCHAR(20) NOT NULL DEFAULT 'product'
                   CHECK (plan_type IN ('product','process')),
  version          VARCHAR(20) DEFAULT '1.0',
  owner            VARCHAR(255),
  status           VARCHAR(30) NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','in-progress','submitted','approved','rejected')),
  notes            TEXT,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_qual_plans_audit ON nexus_qualification_plans(audit_record_id);
CREATE INDEX IF NOT EXISTS idx_nexus_qual_plans_scope ON nexus_qualification_plans(product_scope_id);
CREATE INDEX IF NOT EXISTS idx_nexus_qual_plans_job   ON nexus_qualification_plans(job_id);
