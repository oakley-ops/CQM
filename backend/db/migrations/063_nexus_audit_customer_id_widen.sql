-- NEXUS: reconcile customer_id column width.
-- Migration 059 (this branch) created customer_id as VARCHAR(50); migration 061
-- (cqm-transformation) independently added the same cqmAP coversheet fields and
-- intended VARCHAR(100), but since 059 sorts first its ADD COLUMN IF NOT EXISTS
-- runs first and 061's own ADD COLUMN IF NOT EXISTS then no-ops. Widen explicitly
-- so the column matches what the model declares.
ALTER TABLE nexus_audit_records ALTER COLUMN customer_id TYPE VARCHAR(100);
