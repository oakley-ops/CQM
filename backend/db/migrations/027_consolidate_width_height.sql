-- Consolidate Width and Height into a single #3002# test definition.
-- Width goes in measurement_value, height in secondary_measurement_value.

-- 1. Remove entries created by the separate IT-PHY-001 (width) and IT-PHY-007 (height) imports
DELETE FROM test_entries
WHERE test_definition_id IN (
  SELECT id FROM test_definitions WHERE test_id IN ('IT-PHY-001', 'IT-PHY-007')
);

-- 2. Remove sample_cards that belonged to the W- and H- prefixed sessions
DELETE FROM sample_cards
WHERE session_id IN (
  SELECT id FROM test_sessions
  WHERE session_number LIKE 'W-%' OR session_number LIKE 'H-%'
);

-- 3. Remove the W- and H- prefixed sessions
DELETE FROM test_sessions
WHERE session_number LIKE 'W-%' OR session_number LIKE 'H-%';

-- 4. Rename IT-PHY-001 to the CQM requirement number #3002# and update metadata
UPDATE test_definitions
SET
  test_id             = '#3002#',
  test_name           = 'Width and Height [IS7810/ISO 10373-1]',
  short_name          = 'Width & Height',
  description         = 'Card width and height deviation from nominal per IS7810 #3003#. '
                        'Measured per ISO/IEC 10373-1 method #8030#. '
                        'Width nominal 85.60 mm, Height nominal 53.98 mm, tolerance ±0.13 mm.',
  iso_standard        = 'IS7810 / ISO 10373-1',
  unit_of_measurement = 'mm',
  min_acceptable_value = -0.13,
  max_acceptable_value =  0.13,
  updated_at          = NOW()
WHERE test_id = 'IT-PHY-001';

-- 5. Remove the now-redundant IT-PHY-007 height definition
DELETE FROM test_definitions WHERE test_id = 'IT-PHY-007';
