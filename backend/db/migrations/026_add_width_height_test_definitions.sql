-- Update IT-PHY-001 to Card Width with deviation spec limits (±0.13 mm from 85.60 mm nominal)
UPDATE test_definitions
SET
  test_name            = 'Card Width (IS7810)',
  short_name           = 'Width',
  description          = 'Width deviation from 85.60 mm nominal per IS7810 #3003# (tolerance ±0.13 mm)',
  unit_of_measurement  = 'mm',
  min_acceptable_value = -0.13,
  max_acceptable_value =  0.13,
  updated_at           = NOW()
WHERE test_id = 'IT-PHY-001';

-- Insert IT-PHY-007: Card Height with deviation spec limits (±0.13 mm from 53.98 mm nominal)
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name, description,
  test_type, iso_standard, unit_of_measurement,
  min_acceptable_value, max_acceptable_value,
  is_mandatory, status, created_at, updated_at
)
SELECT
  category_id,
  'IT-PHY-007',
  'Card Height (IS7810)',
  'Height',
  'Height deviation from 53.98 mm nominal per IS7810 #3003# (tolerance ±0.13 mm)',
  test_type,
  iso_standard,
  'mm',
  -0.13,
   0.13,
  is_mandatory,
  'active',
  NOW(),
  NOW()
FROM test_definitions
WHERE test_id = 'IT-PHY-001'
  AND NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = 'IT-PHY-007');
