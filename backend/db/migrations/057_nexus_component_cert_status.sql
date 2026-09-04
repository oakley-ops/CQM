-- NEXUS: align nexus_audit_components.cert_status with the cqmAP V3.A SelectionLists
-- "Certification Status" vocabulary (Supplier/Subcontractor variants).
-- Replaces the legacy 5-value set (CQM Certified / CQM Recognised / Pending / Not Certified / N/A),
-- which lost the Supplier-vs-Subcontractor distinction that V3.A requires.

ALTER TABLE nexus_audit_components
  DROP CONSTRAINT IF EXISTS nexus_audit_components_cert_status_check;

-- Remap any existing rows from the legacy vocabulary to the bible values.
-- Note: legacy 'CQM Recognised' has no component-level equivalent in V3.A
-- (Recognition is a product certification outcome, not a component status), so it
-- is mapped to the closest faithful value, 'Supplier (CQM certified)'.
UPDATE nexus_audit_components SET cert_status = CASE cert_status
  WHEN 'CQM Certified'  THEN 'Supplier (CQM certified)'
  WHEN 'CQM Recognised' THEN 'Supplier (CQM certified)'
  WHEN 'Pending'        THEN 'Supplier (CQM certification pending)'
  WHEN 'Not Certified'  THEN 'Supplier (not CQM certified)'
  WHEN 'N/A'            THEN 'Other (Describe in Comments)'
  ELSE cert_status
END
WHERE cert_status IN ('CQM Certified', 'CQM Recognised', 'Pending', 'Not Certified', 'N/A');

ALTER TABLE nexus_audit_components
  ADD CONSTRAINT nexus_audit_components_cert_status_check
  CHECK (cert_status IN (
    'Supplier (CQM certified)',
    'Supplier (CQM certification pending)',
    'Supplier (not CQM certified)',
    'Subcontractor (CQM certified themselves)',
    'Subcontractor (not CQM certified themselves)',
    'Other (Describe in Comments)'
  ));
