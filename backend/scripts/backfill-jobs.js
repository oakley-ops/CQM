/**
 * Backfill Jobs from existing TestSessions
 * Groups by job_name (the actual job number entered by users/imported from Access).
 * Falls back to session_number only when job_name is empty.
 * Safe to re-run (idempotent) — clears stale jobs first if they look like session numbers.
 *
 * Usage: node backend/scripts/backfill-jobs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize, Job, TestSession } = require('../models');

async function backfill() {
  await sequelize.authenticate();
  console.log('Connected to database.');

  // Step 1: Clear all existing jobs so we can re-create cleanly from job_name
  const existingCount = await Job.count();
  if (existingCount > 0) {
    console.log(`Clearing ${existingCount} existing jobs and unlinking sessions...`);
    await TestSession.update({ job_id: null }, { where: {} });
    await Job.destroy({ where: {} });
    console.log('Cleared.');
  }

  // Step 2: Fetch all sessions with their job_name
  const sessions = await TestSession.findAll({
    attributes: ['id', 'session_number', 'job_name', 'card_type', 'test_date', 'status'],
    order: [['test_date', 'ASC']]
  });

  console.log(`Processing ${sessions.length} sessions...`);

  // Step 3: Group by job_name (the real job number), fall back to session_number
  const byJobNumber = {};
  for (const s of sessions) {
    const raw = (s.job_name || s.session_number || '').trim();
    // Skip blank or obviously bad values (single dot, dashes only, etc.)
    const key = /^[.\-\s]+$/.test(raw) || raw === '' ? null : raw;
    if (!key) continue;
    if (!byJobNumber[key]) byJobNumber[key] = [];
    byJobNumber[key].push(s);
  }

  const jobNumbers = Object.keys(byJobNumber);
  console.log(`Creating ${jobNumbers.length} jobs...`);

  let created = 0, linked = 0;

  for (const jobNumber of jobNumbers) {
    const group = byJobNumber[jobNumber];
    const dates = group.map(s => s.test_date).filter(Boolean).sort();
    const cardTypes = [...new Set(group.map(s => s.card_type).filter(Boolean))];
    const allApproved = group.every(s => s.status === 'approved');

    const job = await Job.create({
      job_number: jobNumber,
      card_type: cardTypes[0] || null,
      status: allApproved ? 'completed' : 'active',
      start_date: dates[0] || null,
      end_date: dates[dates.length - 1] || null
    });
    created++;

    const ids = group.map(s => s.id);
    const [count] = await TestSession.update({ job_id: job.id }, { where: { id: ids } });
    linked += count;
  }

  console.log(`Done. Created: ${created} jobs | Linked: ${linked} sessions`);
  await sequelize.close();
}

backfill().catch(err => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
