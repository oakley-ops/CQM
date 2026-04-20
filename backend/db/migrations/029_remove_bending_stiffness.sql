-- Remove duplicate Bending Stiffness test definitions.
-- IT-MCH-002 and #3041# measure the same thing (longitudinal + transverse N·mm).
-- Neither has any recorded test entries, so a hard delete is safe.

DELETE FROM test_definitions WHERE test_id IN ('IT-MCH-002', '#3041#');
