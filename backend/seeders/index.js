/**
 * Master Seeder Script
 * Runs all CQM test data seeders in correct order
 */

const seedISOStandards = require('./seed_iso_standards');
const seedCardBodyTests = require('./seed_card_body_tests');

async function runAllSeeders() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   CQM Testing Framework - Data Seeding    ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  try {
    // Step 1: ISO Standards
    console.log('📚 Step 1: Seeding ISO Standards...');
    await seedISOStandards();
    console.log('');
    
    // Step 2: Card Body Tests
    console.log('🏗️  Step 2: Seeding Card Body Fabrication Tests...');
    await seedCardBodyTests();
    console.log('');
    
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   ✅ All seeders completed successfully!  ║');
    console.log('╚════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const { sequelize } = require('../config/database');
  
  runAllSeeders()
    .then(() => {
      console.log('\n✅ Database seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = runAllSeeders;
