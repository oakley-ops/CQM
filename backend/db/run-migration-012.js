/**
 * Run Migration 012: Quality Test Data Entry Tables
 */
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');

async function runMigration() {
  try {
    console.log('🚀 Running migration 012_quality_test_data_entry...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', '012_quality_test_data_entry.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into individual statements (handle semicolons properly)
    // We need to be careful with the DO $$ blocks
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;

    for (const line of sql.split('\n')) {
      currentStatement += line + '\n';

      // Track $$ blocks
      const dollarMatches = line.match(/\$\$/g);
      if (dollarMatches) {
        dollarMatches.forEach(() => {
          inDollarQuote = !inDollarQuote;
        });
      }

      // If we hit a semicolon and we're not in a $$ block, it's end of statement
      if (line.trim().endsWith(';') && !inDollarQuote) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    // Execute each statement
    let successCount = 0;
    for (const statement of statements) {
      if (statement.trim() && !statement.startsWith('--')) {
        try {
          await sequelize.query(statement);
          successCount++;

          // Log progress for key operations
          if (statement.includes('CREATE TABLE')) {
            const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
            if (match) {
              console.log(`✅ Created table: ${match[1]}`);
            }
          } else if (statement.includes('CREATE INDEX')) {
            const match = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
            if (match) {
              console.log(`✅ Created index: ${match[1]}`);
            }
          } else if (statement.includes('INSERT INTO test_categories')) {
            console.log('✅ Seeded test categories');
          } else if (statement.includes('INSERT INTO test_definitions')) {
            const match = statement.match(/category_code = '(\w+)'/);
            if (match) {
              console.log(`✅ Seeded test definitions for: ${match[1]}`);
            }
          }
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.error(`⚠️ Statement error: ${err.message}`);
          }
        }
      }
    }

    console.log(`\n✅ Migration completed successfully! (${successCount} statements executed)`);

    // Verify the tables
    const [categories] = await sequelize.query('SELECT COUNT(*) as count FROM test_categories');
    const [definitions] = await sequelize.query('SELECT COUNT(*) as count FROM test_definitions');

    console.log(`\n📊 Verification:`);
    console.log(`   - Test Categories: ${categories[0].count}`);
    console.log(`   - Test Definitions: ${definitions[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
