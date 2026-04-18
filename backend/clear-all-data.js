/**
 * Clears ALL data from all tables.
 * Run with: node backend/clear-all-data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize } = require('./config/database');

async function clearAll() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Use TRUNCATE CASCADE to wipe everything in one shot,
    // bypassing FK constraint ordering issues.
    const tables = [
      'test_entry_metadata',
      'test_entries',
      'sample_cards',
      'test_sessions',
      'test_definitions',
      'test_categories',
      'kpi_config',
      'rag_documents',
      'punch_tools',
      'quote_activity_log',
      'resource_allocations',
      'team_members',
      'task_dependencies',
      'evm_snapshots',
      'expenses',
      'budgets',
      'defects',
      'quality_inspections',
      'risks',
      'change_requests',
      'lessons_learned',
      'milestones',
      'tasks',
      'stakeholders',
      'status_reports',
      'meeting_minutes',
      'communication_logs',
      'requirements',
      'wbs_items',
      'contracts',
      'vendors',
      'quote_documents',
      'quote_actions',
      'quote_milestone_tracking',
      'quotes',
      'quote_milestones',
      'clients',
      'personal_tasks',
      'project_charters',
      'projects',
      'users',
    ];

    const tableList = tables.map(t => `"${t}"`).join(', ');
    await sequelize.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);

    console.log(`✅ All ${tables.length} tables cleared.`);
  } catch (err) {
    console.error('❌ Error clearing data:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

clearAll();
