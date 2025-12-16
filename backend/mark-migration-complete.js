const { Client } = require('pg');
require('dotenv').config();

const markComplete = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pmbok_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    
    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Mark first migration as complete
    await client.query(`
      INSERT INTO schema_migrations (filename) 
      VALUES ('001_initial_schema.sql') 
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Marked 001_initial_schema.sql as complete');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
};

markComplete();
