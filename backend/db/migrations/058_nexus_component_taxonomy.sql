-- NEXUS: align nexus_audit_components.component_type and used_for_product with the
-- cqmAP V3.A SelectionLists "Component Types" (col D) and "Product Types" (col E) vocabularies.
-- Remaps the legacy ad-hoc values that pre-dated the controlled lists. No CHECK constraint is
-- added (the lists are long and evolve across CQM versions); enforcement is at the model + UI layer.

-- component_type → SelectionLists "Component Types"
UPDATE nexus_audit_components SET component_type = CASE component_type
  WHEN 'Chip / Integrated Circuit'      THEN 'ICM'
  WHEN 'Card Body PVC Core'             THEN 'CB'
  WHEN 'Antenna Module'                 THEN 'aIL (no IC)'
  WHEN 'Adhesive / Glue'                THEN 'CB'
  WHEN 'Laminate Film'                  THEN 'CB'
  WHEN 'CB (Card body only)'            THEN 'CB'
  WHEN 'ICC (Integrated Circuit Card)'  THEN 'mICC (ICC made from ICM and CB)'
  WHEN 'ICM (Module assembly only)'     THEN 'ICM'
  ELSE component_type
END;

-- used_for_product → SelectionLists "Product Types"
UPDATE nexus_audit_components SET used_for_product = CASE used_for_product
  WHEN 'IC Card'                  THEN 'mICC (ICC made from ICM and CB)'
  WHEN 'ICM Module'               THEN 'ICM'
  WHEN 'Card Body'                THEN 'CB'
  WHEN 'Mastercard DI Card Body'  THEN 'CB'
  WHEN 'Mastercard/Visa DI ICC'   THEN 'mICC (ICC made from ICM and CB)'
  WHEN 'NXP External ICM'         THEN 'ICM'
  WHEN 'PVC Card Body — External' THEN 'CB'
  ELSE used_for_product
END;

-- Null out any used_for_product still outside the controlled list so the model's
-- validate.isIn does not block future edits to legacy rows (the column is nullable).
UPDATE nexus_audit_components SET used_for_product = NULL
WHERE used_for_product IS NOT NULL
  AND used_for_product NOT IN (
    'IC', 'ICM', 'icIL (IC and antenna)', 'mIL (ICM and antenna)', 'CB',
    'mICC (ICC made from ICM and CB)', 'ilICC (ICC made from icIL, without ICM)',
    'Personalization', 'iacICM', 'fpBSM (with Fingerprint Sensor)',
    'imBSM (with Image Sensor)', 'vcBSM (with Voice Sensor)', 'iacIL (No IC)',
    'iacIL (with IC)', 'fpIAC (with Fingerprint Sensor)', 'imIAC (with Image Sensor)',
    'vcIAC (with Voice Sensor)', 'sIAC (with Display)',
    's+fpIAC (with Display and Fingerprint Sensor)',
    's+imIAC (with Display and Image Sensor)',
    's+vcIAC (with Display and Voice Sensor)'
  );
