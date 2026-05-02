-- Insert #3045# Resistance to Heat (ENV category)
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  max_acceptable_value, unit_of_measurement,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'ENV' LIMIT 1),
  '#3045#',
  'Resistance to Heat [IS10373-1]',
  'Resistance to Heat',
  '#8110#: Resistance to Heat [IS10373-1]',
  'ISO/IEC 10373-1',
  'IS10373-1',
  'passfail',
  'qualification',
  true,
  'active',
  10,
  'mm',
  'Card shall remain fully functional after heat exposure at temperature defined in #3045#. '
    'No warpage > 10 mm, no delamination, no significant visual variation, no loss of functionality. '
    'Biometric cards failing at 60 °C: CSI letter required; retest at 55 °C and 50 °C. '
    'Compliance to #3044# implies compliance to #3045#.',
  'Verify resistance to heat per #8110# (ISO/IEC 10373-1 external method). '
    'Card exposed to defined temperature; mechanical deformation measured under influence of gravity. '
    'Inspect for warpage (≤ 10 mm), delamination, visual variation, and functional integrity. '
    'Sampling considers card construction (layers, materials, process flow) — not artwork or ICM variants. '
    'Qualification minimum: 3 samples. Monitoring: not required.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3045#');
