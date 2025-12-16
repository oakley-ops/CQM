const { Client } = require('pg');
require('dotenv').config();

const checkQuotes = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pmbok_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check quotes count
    const countResult = await client.query('SELECT COUNT(*) as count FROM quotes');
    console.log(`📊 Total quotes in database: ${countResult.rows[0].count}\n`);

    // Get all quotes
    const quotesResult = await client.query(`
      SELECT 
        q.id,
        q.quote_number,
        q.project_name,
        q.priority,
        q.status,
        q.current_stage,
        c.name as client_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY q.id
      LIMIT 10
    `);

    if (quotesResult.rows.length > 0) {
      console.log('📋 First 10 quotes:');
      console.log('='.repeat(80));
      quotesResult.rows.forEach(q => {
        console.log(`${q.quote_number} | ${q.project_name} | ${q.client_name || 'No client'} | ${q.status}`);
      });
      console.log('='.repeat(80));
    } else {
      console.log('❌ No quotes found in database');
    }

    // Check clients
    const clientsResult = await client.query('SELECT COUNT(*) as count FROM clients');
    console.log(`\n🏢 Total clients: ${clientsResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
};

checkQuotes();
