-- NEXUS: Supplier/subcontractor component registry (mirrors Components sheet)
CREATE TABLE IF NOT EXISTS nexus_audit_components (
  id               SERIAL PRIMARY KEY,
  audit_record_id  INTEGER NOT NULL REFERENCES nexus_audit_records(id) ON DELETE CASCADE,
  component_type   TEXT NOT NULL,       -- from SelectionLists component_types
  article_number   VARCHAR(100),
  used_for_product VARCHAR(100),        -- product category this component feeds
  supplier_name    VARCHAR(255),
  supplier_city    VARCHAR(100),
  supplier_country_code CHAR(2),
  cert_status      VARCHAR(50)
                   CHECK (cert_status IN ('CQM Certified','CQM Recognised','Pending','Not Certified','N/A')),
  cert_label       VARCHAR(100),        -- Mastercard cert label/number if applicable
  comment          TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_components_audit ON nexus_audit_components(audit_record_id);
