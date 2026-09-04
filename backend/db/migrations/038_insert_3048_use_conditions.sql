-- Ensure ICC-REQ category exists before inserting definition
INSERT INTO test_categories (category_code, name, description, display_order, is_active, is_mandatory, card_type, qualification_sample_size, monitoring_sample_size, created_at, updated_at)
VALUES ('ICC-REQ', 'ICC Requirements', 'Conformity-by-construction requirements for Integrated Circuit Cards.', 9, true, true, 'ALL', 8, 1, NOW(), NOW())
ON CONFLICT (category_code) DO NOTHING;

-- Insert #3048# Use Conditions (ICC-REQ category) — conformity by construction, no active test
INSERT INTO test_definitions (
  category_id, test_id, test_name, short_name,
  test_method, iso_standard, standard_section,
  test_type, test_frequency, is_mandatory, status,
  pass_criteria, description,
  created_at, updated_at
)
SELECT
  (SELECT id FROM test_categories WHERE category_code = 'ICC-REQ' LIMIT 1),
  '#3048#',
  'Use Conditions',
  'Use Conditions',
  'Conformity by construction — no active test',
  'ICC-REQ',
  '§ 10.1.9',
  'passfail',
  'Not required',
  true,
  'active',
  'Product specification states conformity. '
    'Conformity achieved by construction. '
    'Where conditions deviate from normal card-holder expectations, '
    'adequate guidance shall be provided.',
  'No active testing required. Vendor shall ensure the product specification states '
    'conformity with use and storage conditions. Where conditions deviate from what '
    'a card holder would normally expect, the Vendor shall provide adequate guidance '
    'to card holders. Conformity is achieved by construction.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM test_definitions WHERE test_id = '#3048#');
