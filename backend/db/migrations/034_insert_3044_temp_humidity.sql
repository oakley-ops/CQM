-- Insert #3044# Durability – Temperature and Humidity Exposure (ENV category)
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
  '#3044#',
  'Durability – Temperature and Humidity Exposure',
  'T&H Exposure',
  '#8091#: Durability – Dimensional Stability with Temperature and Humidity',
  'ISO/IEC 10373-1',
  'IS10373-1',
  'passfail',
  'qualification',
  true,
  'active',
  10,
  'mm',
  'Card shall remain fully functional after exposure per #8091# profile. '
    'No warpage > 10 mm, no delamination, no significant visual variation, '
    'no loss of specified functionality. '
    'Biometric cards failing at 60 °C: CSI letter required; retest at 55 °C and 50 °C.',
  'Expose cards to a temperature and humidity profile per #8091# '
    '(climatic chamber: 23–100 °C ± 3 °C, 5–95 % r.H. ± 5 %). '
    'Inspect for warpage (≤ 10 mm), delamination, visual variation, and functional integrity. '
    'Secondary method #8092# applies for ICM testing at 85 °C / 85 % r.H. '
    'For biometric/advanced cards failing at 60 °C: obtain CSI letter and retest at 55 °C and 50 °C. '
    'Monitoring: not required.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3044#');
