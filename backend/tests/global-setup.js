/**
 * Jest globalSetup — runs once before the whole test run.
 * Creates the dedicated `cqm_test` database if it does not already exist, using
 * the same Postgres credentials as the app but connecting to the maintenance
 * `postgres` database. The schema itself is built by the integration suite via
 * sequelize.sync({ force: true }).
 */
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = async () => {
  const testDb = process.env.TEST_DB_NAME || 'cqm_test';

  // Hard guard: never let the test DB be the real one.
  if (!/test/i.test(testDb)) {
    throw new Error(`TEST_DB_NAME "${testDb}" does not look like a test database — aborting.`);
  }

  const admin = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDb]);
  if (rowCount === 0) {
    // Identifier can't be parameterised; testDb is validated against /test/i above.
    await admin.query(`CREATE DATABASE "${testDb}"`);
    // eslint-disable-next-line no-console
    console.log(`\n[global-setup] created test database "${testDb}"`);
  }
  await admin.end();
};
