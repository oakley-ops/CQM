-- Rename IT-MCH-001 to #3055# and set the official test method and spec
UPDATE test_definitions
SET
  test_id             = '#3055#',
  test_name           = 'Wrapping Test Robustness [IS10373-1]',
  short_name          = 'Wrapping Test',
  test_method         = '#8220#: Mechanical Reliability: Wrapping Test [IS10373-1]',
  iso_standard        = 'ISO/IEC 10373-1',
  standard_section    = 'IS10373-1',
  pass_criteria       = 'IC shall be functional (ATR/ATS verified) before and after wrapping. '
                        'No significant visual damage (crack, delamination, chip dislodged). '
                        'For IAC: any connected component shall remain functional, or if not, '
                        'the failure shall be of the component itself — not of the connection '
                        'between the ICM and the card. '
                        'Test report shall state compliance and cylinder diameter(s) tested.',
  description         = 'Verify the mechanical robustness of the card by placing it into the jaws '
                        'of the test device and wrapping major parts of the card around a metal '
                        'cylinder (40 mm or 50 mm diameter per Figure 24). '
                        'Apply 10 wrapping cycles contact side up and 10 cycles reverse side up. '
                        'For IAC with biometric sensor use test method #8221#. '
                        'CQM qualification minimum sample size: 8. Monitoring: 1 item/month.',
  updated_at          = NOW()
WHERE test_id = 'IT-MCH-001';
