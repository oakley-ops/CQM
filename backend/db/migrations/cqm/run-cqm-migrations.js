/**
 * CQM Transformation Migration Runner
 * 
 * This script runs all CQM transformation migration scripts in sequence
 * against the cqm_tracking_test database.
 * 
 * Usage: node run-cqm-migrations.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// List of migrations to run in order
const migrations = [
    '001_rename_core_tables.sql',
    '002_add_facility_cqm_fields.sql',
    // Add more migrations here as you create them
];

/**
 * Run a single SQL migration file
 */
async function runMigration(client, migrationFile) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Running migration: ${migrationFile}`);
    console.log('='.repeat(60));

    const migrationPath = path.join(__dirname, migrationFile);
    
    // Check if file exists
    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
    }

    // Read SQL file
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute SQL
    try {
        const result = await client.query(sql);
        console.log(`✅ Migration completed: ${migrationFile}`);
        return result;
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`);
        throw error;
    }
}

/**
 * Main migration runner
 */
async function runAllMigrations() {
    // Create PostgreSQL client
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'cqm_tracking_test',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    });

    try {
        // Connect to database
        await client.connect();
        console.log('\n🔌 Connected to database:', process.env.DB_NAME);
        
        // Display database info
        const dbInfo = await client.query('SELECT version()');
        console.log('📊 PostgreSQL version:', dbInfo.rows[0].version.split(',')[0]);

        // Count existing tables
        const tableCount = await client.query(`
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`📋 Current table count: ${tableCount.rows[0].count}`);

        console.log('\n🚀 Starting CQM transformation migrations...\n');

        // Run each migration in sequence
        for (const migration of migrations) {
            await runMigration(client, migration);
        }

        // Count tables after migration
        const newTableCount = await client.query(`
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log(`\n📋 Table count after migrations: ${newTableCount.rows[0].count}`);

        // Display renamed tables
        console.log('\n📊 Verifying CQM tables:');
        const cqmTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'manufacturing_facilities',
                'test_results',
                'audits',
                'non_conformities',
                'capa_actions',
                'qms_documents',
                'iso_compliance_records'
            )
            ORDER BY table_name
        `);

        cqmTables.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('🎉 All migrations completed successfully!');
        console.log('='.repeat(60));
        console.log(`\nTotal migrations run: ${migrations.length}`);
        console.log('Status: ✅ SUCCESS\n');

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ Migration Error:');
        console.error('='.repeat(60));
        console.error(error.message);
        console.error('\nStack trace:');
        console.error(error.stack);
        console.error('\n' + '='.repeat(60));
        console.error('Status: ❌ FAILED\n');
        process.exit(1);
    } finally {
        // Close database connection
        await client.end();
        console.log('🔌 Database connection closed\n');
    }
}

// Run migrations
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║       CQM TRANSFORMATION MIGRATION RUNNER                  ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝');

runAllMigrations();



