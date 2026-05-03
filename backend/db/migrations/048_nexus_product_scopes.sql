-- NEXUS: Product scope selection (one row per product category per audit)
CREATE TABLE IF NOT EXISTS nexus_product_scopes (
  id               SERIAL PRIMARY KEY,
  audit_record_id  INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  product_category VARCHAR(20) NOT NULL
                   CHECK (product_category IN ('ic','icm','il','cb','icc','p','iacicm','bsm','iacil','iac')),
  product_variant  VARCHAR(100),   -- specific variant within category
  product_name     VARCHAR(255),   -- vendor's product name
  in_scope         BOOLEAN NOT NULL DEFAULT false,
  audited          BOOLEAN NOT NULL DEFAULT false,
  rank             CHAR(1) CHECK (rank IN ('A','B','C','D','tbd')) DEFAULT 'tbd',
  cert_outcome     CHAR(1) CHECK (cert_outcome IN ('A','R','F','N')) ,  -- Approval/Recognition/Fail/Not in scope
  notes            TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (audit_record_id, product_category, product_variant)
);

CREATE INDEX IF NOT EXISTS idx_nexus_product_scopes_audit ON nexus_product_scopes(audit_record_id);
