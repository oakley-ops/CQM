-- Rename IT-MCH-005 to #3054# and set the official test method and spec
UPDATE test_definitions
SET
  test_id             = '#3054#',
  test_name           = '3 Wheel Test Robustness [IS10373-1]',
  short_name          = '3 Wheel Test',
  test_method         = '#8210#: 3 Wheel Test [IS10373-1]',
  iso_standard        = 'ISO/IEC 10373-1',
  standard_section    = 'IS10373-1',
  pass_criteria       = 'Every Mechanically Sensitive Area (MSA) shall pass at 8 N ± 0.5 N '
                        'for 2 × 50 cycles horizontally and vertically. '
                        'Recommended: 10 N (monitoring), 12 N (qualification). '
                        'IAC at 15 N: result reported for information only — compliance not required.',
  description         = 'Verify robustness of every Mechanically Sensitive Area (MSA) using '
                        'three-wheel apparatus (one above, two below the card). '
                        'Default: 8 N ± 0.5 N for 2 × 50 cycles H + V per MSA. '
                        'Higher forces (10 N / 12 N / 15 N) for monitoring and qualification stages. '
                        'Applicable to ICC, IAC, IL, CB, iacIL.',
  updated_at          = NOW()
WHERE test_id = 'IT-MCH-005';
