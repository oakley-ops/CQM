const express = require('express');
const { Client } = require('pg');
require('dotenv').config();

const testAPI = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pmbok_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    await client.connect();
    console.log('✅ Database connected\n');

    // Test the exact query the API uses
    const result = await client.query(`
      SELECT 
        q.*,
        c.name as client_name,
        u.first_name as assignee_first_name,
        u.last_name as assignee_last_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.assigned_to = u.id
      ORDER BY q.created_date DESC
      LIMIT 20
    `);

    console.log(`📊 Query returned ${result.rows.length} quotes\n`);

    if (result.rows.length > 0) {
      console.log('Sample quote data:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

    // Check if the backend server is running
    console.log('\n🔍 Checking if backend server is running...');
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/quotes',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Backend server is running (Status: ${res.statusCode})`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('⚠️  Got 401 Unauthorized - authentication is working correctly');
        } else {
          console.log('Response:', data.substring(0, 200));
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Backend server is NOT running or not accessible');
      console.log('Error:', error.message);
    });

    req.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
};

testAPI();
