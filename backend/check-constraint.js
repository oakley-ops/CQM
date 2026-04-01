const { Client } = require('pg');
require('dotenv').config();

const c = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cqm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

c.connect().then(async () => {
  const indexes = await c.query(
    "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='test_entries' ORDER BY indexname"
  );
  console.log('=== INDEXES on test_entries ===');
  indexes.rows.forEach(r => console.log(r.indexname, ':', r.indexdef));

  const constraints = await c.query(
    "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid='test_entries'::regclass"
  );
  console.log('\n=== CONSTRAINTS on test_entries ===');
  constraints.rows.forEach(r => console.log(r.conname, ':', r.def));

  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
