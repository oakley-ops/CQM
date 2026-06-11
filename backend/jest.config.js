/**
 * Jest configuration for the CQM backend.
 *
 * Tests run serially (maxWorkers: 1) against a dedicated `cqm_test` database that
 * is created by global-setup.js and rebuilt (sync force) by the integration suite,
 * so a test run never touches the dev/prod `cqm_db`.
 */
module.exports = {
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.js',
  setupFiles: ['<rootDir>/tests/setup-env.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
  // Coverage (collected when run with --coverage) — ignore non-app dirs
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'services/**/*.js'
  ],
  coveragePathIgnorePatterns: ['/node_modules/']
};
