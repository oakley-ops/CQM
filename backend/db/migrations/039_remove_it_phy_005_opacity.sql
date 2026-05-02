-- Remove IT-PHY-005 (Opacity of cards with a translucent or transparent core)
-- Opacity is covered by Peel Strength #3008#; no separate test record needed.
DELETE FROM test_definitions WHERE test_id = 'IT-PHY-005';
