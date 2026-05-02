-- Insert #3050# ESD Conductivity (ELE category)
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'ELE' LIMIT 1),
  '#3050#',
  'ESD Conductivity (ESC)',
  'ESD Conductivity',
  '#8250#: ESD Conductivity for Cards / #8260#: ESD Conductivity for Card Components',
  'ISO/IEC 10373-1',
  'IS10373-1',
  'passfail',
  'qualification',
  true,
  'active',
  'Contact scenarios 1–4: Qn% ≤ 15 % at 8 kV. '
    'Contact scenarios 5–6: Qn% ≤ 25 % at 8 kV. '
    'Conformity may be assumed if all CHD components are known safe at 8 kV '
    'or component passes #8260#.',
  'Measure ESD conductivity using current probe and digital oscilloscope. '
    'Card placed between grid electrodes; ESD applied at 8 kV (default). '
    'Relative charge Qn% computed per contact scenario (1–6) against calibration baseline. '
    'Qualification minimum: 5 samples. Monitoring: not required.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3050#');
