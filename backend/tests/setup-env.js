/**
 * Runs in each test worker BEFORE any application module is required, so that
 * config/database.js picks up the test database name. dotenv (loaded later by the
 * app) will not override these because they are already set.
 */
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'cqm_test';

// Keep registration admin-gated during tests (this is the secure default we ship).
delete process.env.ALLOW_PUBLIC_REGISTRATION;
