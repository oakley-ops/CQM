require('dotenv').config();
const { TestCategory, TestDefinition, sequelize } = require('./models');

/**
 * Seed ICC card test definitions
 * Source: IC Card (Any ICC) requirements table
 */
async function seedICCTests() {
  try {
    console.log('🌱 Seeding ICC Card Test Definitions...\n');
    await sequelize.authenticate();

    const transaction = await sequelize.transaction();

    try {
      // Create ICC category if it doesn't exist
      const [category, created] = await TestCategory.findOrCreate({
        where: { category_code: 'ICC-REQ' },
        defaults: {
          category_code: 'ICC-REQ',
          name: 'IC Card Requirements',
          description: 'Product requirements and monitoring tests for IC Card (Any ICC) per Mastercard standards.',
          iso_standard: 'ISO 7810 / ISO 7816',
          card_type: 'ICC',
          display_order: 10,
          is_active: true,
          is_mandatory: true,
          icon: 'microchip',
          color: '#1565c0'
        },
        transaction
      });

      if (created) {
        console.log(`✅ Created category: ${category.category_code} - ${category.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${category.category_code} - ${category.name}`);
      }

      // ICC test definitions from the requirements table
      const definitions = [
        {
          test_id: '#2515#',
          test_name: 'Loading of Software into IC, ICM, IL, or card before personalization',
          standard_section: '7.1.5',
          test_method: 'vendor',
          test_frequency: '1/Batch',
          test_type: 'passfail',
          is_mandatory: true,
          status: 'active'
        },
        {
          test_id: '#3007#',
          test_name: 'Overall Card Warpage [IS7810]',
          standard_section: '9.1.7',
          test_method: '#8100#',
          test_frequency: '8/Batch',
          test_type: 'passfail',
          is_mandatory: true,
          status: 'active'
        },
        {
          test_id: '#3041#',
          test_name: 'Bending Stiffness',
          standard_section: '10.1.1',
          test_method: '#8080#',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3042#',
          test_name: 'Dynamic Bending Stress [IS7810]',
          standard_section: '10.1.2',
          test_method: '#8140#',
          test_frequency: '1/Shift',
          test_type: 'passfail',
          is_mandatory: true,
          status: 'active'
        },
        {
          test_id: '#3043#',
          test_name: 'Dynamic Torsional Stress',
          standard_section: '10.1.3',
          test_method: '#8150#',
          test_frequency: '1/Week',
          test_type: 'passfail',
          is_mandatory: true,
          status: 'active'
        },
        {
          test_id: '#3044#',
          test_name: 'Durability - Temperature and Humidity Exposure',
          standard_section: '10.1.5',
          test_method: '#8091#',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3045#',
          test_name: 'Resistance to Heat',
          standard_section: '10.1.6',
          test_method: '#8110#',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3046#',
          test_name: 'Resistance to Chemicals',
          standard_section: '10.1.7',
          test_method: '#8190#',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3048#',
          test_name: 'Use Conditions',
          standard_section: '10.1.9',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3049#',
          test_name: 'Toxicity, Health and Environment',
          standard_section: '10.1.11',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3050#',
          test_name: 'ESD Conductivity - ESC',
          standard_section: '10.1.12',
          test_method: '#8250# / #8260#',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3067#',
          test_name: 'Suitability for an Identification Notch',
          standard_section: '10.1.13',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3100#',
          test_name: 'Cards made of materials other than newly produced PVC, and cards with an associated environmental claim – Requirement to maintain a valid CSI Letter (and CEC Certification if applicable)',
          standard_section: '10.1.14',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3200#',
          test_name: 'CB, ICC, and IAC – Requirement to maintain a valid Mastercard Card Vendor Conformity Statement (CVCS)',
          standard_section: '10.1.16',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3052#',
          test_name: 'Card - Construction and Specification',
          standard_section: '11.1.1',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        },
        {
          test_id: '#3056#',
          test_name: 'IC or ICM',
          standard_section: '11.1.5',
          test_method: 'spec',
          test_frequency: 'not req\'ed',
          test_type: 'passfail',
          is_mandatory: false,
          status: 'active'
        }
      ];

      let created_count = 0;
      let skipped_count = 0;

      for (const def of definitions) {
        const [record, wasCreated] = await TestDefinition.findOrCreate({
          where: { test_id: def.test_id },
          defaults: {
            ...def,
            category_id: category.id
          },
          transaction
        });

        if (wasCreated) {
          created_count++;
          console.log(`   ✅ ${def.test_id} - ${def.test_name.substring(0, 60)}...`);
        } else {
          skipped_count++;
          console.log(`   ⏭️  ${def.test_id} already exists`);
        }
      }

      await transaction.commit();

      console.log('\n🎉 ICC test definitions seeded successfully!');
      console.log(`   Created: ${created_count}`);
      console.log(`   Skipped (already exist): ${skipped_count}`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error seeding ICC tests:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seedICCTests();
}

module.exports = seedICCTests;
