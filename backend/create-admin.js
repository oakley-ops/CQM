const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

const createAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@cqm.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ ADMIN_PASSWORD is not set.');
    console.error('   Set it before running, e.g.:');
    console.error('     ADMIN_PASSWORD="your-strong-password" node create-admin.js');
    console.error('   (or add ADMIN_PASSWORD to your .env file)');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'cqm_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🔐 Creating/updating admin user...');
    
    // Check if admin user exists
    const existingUser = await client.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);

    let result;
    if (existingUser.rows.length > 0) {
      result = await client.query(`
        UPDATE users
        SET password_hash = $1, first_name = $2, last_name = $3, username = $4
        WHERE email = $5
        RETURNING id, username, email, first_name, last_name, role
      `, [passwordHash, 'Admin', 'User', 'admin', adminEmail]);
      console.log('✅ Admin user updated!');
    } else {
      result = await client.query(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, username, email, first_name, last_name, role
      `, ['admin', adminEmail, passwordHash, 'Admin', 'User', 'admin']);
      console.log('✅ Admin user created!');
    }

    console.log('✅ Admin user ready!');
    console.log('👤 Username: admin');
    console.log(`📧 Email: ${adminEmail}`);
    console.log('🔑 Password: (set via ADMIN_PASSWORD)');
    console.log('👤 User:', result.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
};

createAdmin();
