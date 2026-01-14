require('dotenv').config();
const { TestCategory, sequelize } = require('./models');
const testCategoriesData = require('./seed-data/test-categories.json');

/**
 * Seed Test Categories for CQM System
 */
async function seedTestCategories() {
  try {
    console.log('🌱 Seeding Test Categories...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Clear existing test categories
      const existingCount = await TestCategory.count();
      if (existingCount > 0) {
        console.log(`⚠️  Found ${existingCount} existing test categories`);
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question('Do you want to clear existing data? (yes/no): ', resolve);
        });
        readline.close();

        if (answer.toLowerCase() === 'yes') {
          await TestCategory.destroy({ where: {}, transaction });
          console.log('🗑️  Cleared existing test categories\n');
        } else {
          console.log('⏭️  Skipping, keeping existing data\n');
          await transaction.rollback();
          return;
        }
      }

      // Prepare test categories with additional fields
      const categories = [
        {
          category_code: 'PHY',
          name: 'Physical Tests (ISO 7810)',
          description: 'Tests related to the physical characteristics of the card including dimensions, toxicity, chemical resistance, durability, and structural integrity.',
          iso_standard: 'ISO 7810',
          standard_reference: 'ISO/IEC 7810:2019 - Identification cards - Physical characteristics',
          display_order: 1,
          is_active: true,
          is_mandatory: true,
          icon: 'ruler-combined',
          color: '#1976d2'
        },
        {
          category_code: 'SMT',
          name: 'Smart Card Tests (ISO 7816-1)',
          description: 'Tests specific to smart card functionality, contact interface, and chip communication protocols.',
          iso_standard: 'ISO 7816-1',
          standard_reference: 'ISO/IEC 7816-1:2011 - Identification cards - Integrated circuit cards - Part 1: Cards with contacts',
          display_order: 2,
          is_active: true,
          is_mandatory: true,
          icon: 'microchip',
          color: '#388e3c'
        },
        {
          category_code: 'EMV',
          name: 'EMV Chip Functionality',
          description: 'Tests for EMV chip interoperability, electrical interface, communication protocols, and transaction processing.',
          iso_standard: 'EMVCo L1',
          standard_reference: 'EMVCo Level 1 Specifications - Contact and Contactless',
          display_order: 3,
          is_active: true,
          is_mandatory: true,
          icon: 'credit-card',
          color: '#f57c00'
        },
        {
          category_code: 'MAG',
          name: 'Magnetic Stripe Tests',
          description: 'Tests for magnetic stripe encoding quality, data integrity, read reliability, and coercivity.',
          iso_standard: 'ISO 7811-2',
          standard_reference: 'ISO/IEC 7811-2:2018 - Identification cards - Recording technique - Part 2: Magnetic stripe',
          display_order: 4,
          is_active: true,
          is_mandatory: false,
          icon: 'wave-square',
          color: '#7b1fa2'
        },
        {
          category_code: 'CBY',
          name: 'Card Body Construction',
          description: 'Tests for the quality and integrity of the card body materials, lamination, and assembly.',
          iso_standard: 'ISO 7810',
          standard_reference: 'ISO/IEC 7810:2019 - Card body construction requirements',
          display_order: 5,
          is_active: true,
          is_mandatory: true,
          icon: 'layer-group',
          color: '#0288d1'
        },
        {
          category_code: 'ENV',
          name: 'Environmental Tests',
          description: 'Tests for resistance to various environmental conditions including temperature, humidity, UV exposure, and X-ray.',
          iso_standard: 'ISO 10373-1',
          standard_reference: 'ISO/IEC 10373-1:2020 - Identification cards - Test methods - Part 1: General characteristics',
          display_order: 6,
          is_active: true,
          is_mandatory: true,
          icon: 'cloud-sun',
          color: '#00796b'
        },
        {
          category_code: 'MCH',
          name: 'Mechanical Tests',
          description: 'Tests for the mechanical durability and resistance to stress, bending, twisting, and wear.',
          iso_standard: 'ISO 10373-1',
          standard_reference: 'ISO/IEC 10373-1:2020 - Mechanical test methods',
          display_order: 7,
          is_active: true,
          is_mandatory: true,
          icon: 'cog',
          color: '#5d4037'
        },
        {
          category_code: 'ELE',
          name: 'Electrical Tests',
          description: 'Tests for electrical properties and performance of the card components including voltage, current, and resistance.',
          iso_standard: 'ISO 10373-3',
          standard_reference: 'ISO/IEC 10373-3:2018 - Electrical test methods',
          display_order: 8,
          is_active: true,
          is_mandatory: true,
          icon: 'bolt',
          color: '#c62828'
        }
      ];

      // Insert test categories
      const createdCategories = await TestCategory.bulkCreate(categories, { transaction });

      console.log(`✅ Successfully created ${createdCategories.length} test categories:\n`);
      
      createdCategories.forEach(cat => {
        console.log(`   ${cat.category_code} - ${cat.name}`);
      });

      // Commit transaction
      await transaction.commit();

      console.log('\n🎉 Test categories seeded successfully!\n');
      console.log('📊 Summary:');
      console.log(`   Total Categories: ${createdCategories.length}`);
      console.log(`   Mandatory Categories: ${createdCategories.filter(c => c.is_mandatory).length}`);
      console.log(`   Optional Categories: ${createdCategories.filter(c => !c.is_mandatory).length}`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error seeding test categories:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed function
if (require.main === module) {
  seedTestCategories();
}

module.exports = seedTestCategories;



