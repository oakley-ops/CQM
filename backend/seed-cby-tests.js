/**
 * Seed Card Body Construction (CBY) test definitions
 * Run: cd backend && node seed-cby-tests.js
 */
const { TestCategory, TestDefinition } = require('./models');

async function seedCBYTests() {
  try {
    console.log('🌱 Seeding Card Body Construction (CBY) tests...');

    const [category] = await TestCategory.findOrCreate({
      where: { category_code: 'CBY' },
      defaults: {
        category_code: 'CBY',
        name: 'Card Body Construction',
        description: 'Tests for card body physical and chemical properties',
        card_type: 'ALL',
        status: 'active',
      },
    });

    console.log(`✅ Category: ${category.category_code} - ${category.name} (id=${category.id})`);

    const definitions = [
      {
        test_id: '#3021#',
        test_name: 'Solidity-Adhesion or Blocking Test',
        standard_section: '9.1.26',
        test_method: '#8130#',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description:
          'No adverse effects when unembossed card test samples (finished cards) are stacked together and subjected to a defined heat and humidity.',
      },
      {
        test_id: '#3006#',
        test_name: 'Card Edges / Edge Burrs [CQM 9.1.6]',
        standard_section: '9.1.6',
        test_method: '#8070#',
        test_frequency: '20/Batch',
        test_type: 'measurement',
        is_mandatory: true,
        status: 'active',
        description:
          'The edges of the CB/PICC shall be free of edge burs, notches, and other imperfections. Edge burr measurement shall not exceed 0.08 mm.',
      },
    ];

    for (const def of definitions) {
      const [record, created] = await TestDefinition.findOrCreate({
        where: { test_id: def.test_id },
        defaults: { ...def, category_id: category.id },
      });

      if (!created && record.category_id !== category.id) {
        await record.update({ category_id: category.id });
        console.log(`🔄 Updated category for ${def.test_id}`);
      }

      console.log(`${created ? '✅ Created' : '⏭️  Exists'}: ${def.test_id} - ${def.test_name}`);
    }

    console.log('\n✅ CBY seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedCBYTests();
