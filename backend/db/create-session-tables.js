/**
 * Create test_sessions and test_entries tables
 */
const { sequelize } = require('../config/database');

async function createTables() {
  try {
    console.log('🚀 Creating test_sessions and test_entries tables...\n');

    // Create test_sessions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        id SERIAL PRIMARY KEY,
        session_number VARCHAR(50) UNIQUE NOT NULL,
        card_type VARCHAR(50) NOT NULL,
        manufacturing_stage VARCHAR(100) NOT NULL,
        batch_lot_number VARCHAR(100) NOT NULL,
        card_serial_number VARCHAR(100),
        test_date DATE NOT NULL,
        inspector_id INTEGER REFERENCES users(id),
        equipment_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'draft',
        general_notes TEXT,
        submitted_at TIMESTAMP,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created table: test_sessions');

    // Create test_entries table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test_entries (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
        test_definition_id INTEGER NOT NULL REFERENCES test_definitions(id),
        measurement_value DECIMAL(10,4),
        assessment_value VARCHAR(50),
        pass_status BOOLEAN,
        multi_value_notes TEXT,
        notes TEXT,
        retest_required BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_session_test UNIQUE(session_id, test_definition_id)
      )
    `);
    console.log('✅ Created table: test_entries');

    // Create indexes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_sessions_inspector ON test_sessions(inspector_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_sessions_date ON test_sessions(test_date)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_sessions_batch ON test_sessions(batch_lot_number)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_entries_session ON test_entries(session_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_entries_definition ON test_entries(test_definition_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_test_entries_pass_status ON test_entries(pass_status)`);
    console.log('✅ Created indexes');

    // Verify
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('test_categories', 'test_definitions', 'test_sessions', 'test_entries')
    `);

    console.log('\n📊 Tables in database:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTables();
