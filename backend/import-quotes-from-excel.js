const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

const importQuotes = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pmbok_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('📂 Reading Excel file...');
    const workbook = XLSX.readFile('C:\\Users\\servi\\TR_Inventory_PM\\Quote Tracker - Master.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} rows in Excel file`);
    console.log('📋 Sample row:', data[0]);
    console.log('\n🔍 All columns found:');
    if (data.length > 0) {
      Object.keys(data[0]).forEach(key => console.log(`   - ${key}`));
    }

    console.log('\n🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get all users for assignment mapping
    const usersResult = await client.query('SELECT id, first_name, last_name, email FROM users');
    const users = usersResult.rows;
    console.log(`👥 Found ${users.length} users in database`);

    // Get all clients
    const clientsResult = await client.query('SELECT id, name FROM clients');
    const existingClients = new Map(clientsResult.rows.map(c => [c.name.toLowerCase(), c.id]));
    console.log(`🏢 Found ${existingClients.size} existing clients\n`);

    // Get milestone templates
    const milestonesResult = await client.query('SELECT id, name, sequence_order FROM quote_milestones ORDER BY sequence_order');
    const milestones = milestonesResult.rows;
    console.log(`📍 Found ${milestones.length} milestone templates\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of data) {
      try {
        // Extract data from Excel row (adjust column names based on your Excel file)
        const projectName = row['Project Name'] || row['Project'] || row['Quote Name'];
        const clientName = row['Client'] || row['Customer'] || row['Company'];
        const priority = row['Priority'] || 'Medium';
        const status = row['Status'] || 'Not Started';
        const currentStage = row['Current Stage'] || row['Stage'] || 'Requirements Received';
        const assignedTo = row['Assigned To'] || row['Assignee'];
        const deadline = row['Deadline'] || row['Due Date'];
        const createdDate = row['Created Date'] || row['Date Created'];
        const notes = row['Notes'] || row['Comments'] || '';
        const quoteValue = row['Quote Value'] || row['Value'] || row['Amount'];
        const nextAction = row['Next Action'];
        const blockers = row['Blockers'] || row['Blocker'];

        // Skip if no project name
        if (!projectName) {
          console.log(`⏭️  Skipping row - no project name`);
          skipped++;
          continue;
        }

        console.log(`\n📝 Processing: ${projectName}`);

        // Find or create client
        let clientId = null;
        if (clientName) {
          const clientNameLower = clientName.toLowerCase().trim();
          if (existingClients.has(clientNameLower)) {
            clientId = existingClients.get(clientNameLower);
            console.log(`   ✓ Found existing client: ${clientName}`);
          } else {
            // Create new client
            const newClient = await client.query(
              'INSERT INTO clients (name) VALUES ($1) RETURNING id',
              [clientName]
            );
            clientId = newClient.rows[0].id;
            existingClients.set(clientNameLower, clientId);
            console.log(`   ✓ Created new client: ${clientName}`);
          }
        }

        // Find user by name
        let assignedUserId = null;
        if (assignedTo) {
          const user = users.find(u => {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().trim();
            const firstName = (u.first_name || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const searchTerm = assignedTo.toLowerCase();
            
            return fullName.includes(searchTerm) ||
                   firstName === searchTerm ||
                   email.includes(searchTerm);
          });
          if (user) {
            assignedUserId = user.id;
            console.log(`   ✓ Assigned to: ${user.first_name || ''} ${user.last_name || ''}`);
          } else {
            console.log(`   ⚠️  User not found: ${assignedTo}`);
          }
        }

        // Map priority
        const priorityMap = {
          'critical': 'Critical',
          'high': 'High',
          'medium': 'Medium',
          'low': 'Low'
        };
        const mappedPriority = priority ? (priorityMap[priority.toLowerCase()] || 'Medium') : 'Medium';

        // Map status
        const statusMap = {
          'not started': 'Not Started',
          'in process': 'In Process',
          'in progress': 'In Process',
          'on hold': 'On Hold',
          'completed': 'Completed',
          'cancelled': 'Cancelled'
        };
        const mappedStatus = status ? (statusMap[status.toLowerCase()] || 'Not Started') : 'Not Started';

        // Parse dates
        const parseDate = (dateValue) => {
          if (!dateValue) return null;
          if (typeof dateValue === 'number') {
            // Excel date serial number
            const date = XLSX.SSF.parse_date_code(dateValue);
            return new Date(date.y, date.m - 1, date.d).toISOString().split('T')[0];
          }
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
          }
          // Try to parse string date
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
          return null;
        };

        const parsedDeadline = parseDate(deadline);
        const parsedCreatedDate = parseDate(createdDate) || new Date().toISOString().split('T')[0];

        // Parse quote value
        let parsedQuoteValue = null;
        if (quoteValue) {
          const numValue = typeof quoteValue === 'number' ? quoteValue : parseFloat(String(quoteValue).replace(/[^0-9.-]/g, ''));
          if (!isNaN(numValue)) {
            parsedQuoteValue = numValue;
          }
        }

        // Generate quote number
        const year = new Date().getFullYear();
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM quotes WHERE quote_number LIKE $1`,
          [`Q${year}-%`]
        );
        const nextNumber = parseInt(countResult.rows[0].count) + 1;
        const generatedQuoteNumber = `Q${year}-${String(nextNumber).padStart(4, '0')}`;

        // Insert quote
        const quoteResult = await client.query(`
          INSERT INTO quotes (
            quote_number,
            client_id, 
            project_name, 
            priority, 
            status, 
            current_stage,
            assigned_to,
            deadline,
            created_date,
            notes,
            quote_value
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, quote_number
        `, [
          generatedQuoteNumber,
          clientId,
          projectName,
          mappedPriority,
          mappedStatus,
          currentStage,
          assignedUserId,
          parsedDeadline,
          parsedCreatedDate,
          notes,
          parsedQuoteValue
        ]);

        const quoteId = quoteResult.rows[0].id;
        const quoteNumber = quoteResult.rows[0].quote_number;
        console.log(`   ✅ Created quote: ${quoteNumber}`);

        // Initialize milestone tracking
        for (const milestone of milestones) {
          await client.query(`
            INSERT INTO quote_milestone_tracking (
              quote_id,
              milestone_id,
              status
            )
            VALUES ($1, $2, $3)
          `, [quoteId, milestone.id, 'Not Started']);
        }
        console.log(`   ✓ Initialized ${milestones.length} milestones`);

        // Add next action if exists
        if (nextAction && nextAction.trim()) {
          await client.query(`
            INSERT INTO quote_actions (
              quote_id,
              action_type,
              description
            )
            VALUES ($1, $2, $3)
          `, [quoteId, 'Next Action', nextAction.trim()]);
          console.log(`   ✓ Added next action`);
        }

        // Add blocker if exists
        if (blockers && blockers.trim()) {
          await client.query(`
            INSERT INTO quote_actions (
              quote_id,
              action_type,
              description
            )
            VALUES ($1, $2, $3)
          `, [quoteId, 'Blocker', blockers.trim()]);
          console.log(`   ✓ Added blocker`);
        }

        imported++;

      } catch (error) {
        console.error(`   ❌ Error importing row:`, error.message);
        console.error(`   Stack:`, error.stack);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${imported} quotes`);
    console.log(`⏭️  Skipped: ${skipped} rows`);
    console.log(`❌ Errors: ${errors} rows`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
};

importQuotes();
