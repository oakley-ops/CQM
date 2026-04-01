/**
 * Seed Overlay Peel Strength test definition
 * CQM 2.19; Section 9.1.20 #3015#
 * Run: cd backend && node seed-overlay-peel.js
 */
const { TestCategory, TestDefinition } = require('./models');

async function seedOverlayPeel() {
  try {
    console.log('🌱 Seeding Overlay Peel Strength (CBY) test...');

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

    const [record, created] = await TestDefinition.findOrCreate({
      where: { test_id: '#3015#' },
      defaults: {
        test_id: '#3015#',
        test_name: 'Solidity/Peel Strength of the Overlay',
        standard_section: '9.1.20',
        test_method: '#3015#',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'N/cm',
        min_acceptable_value: 5,
        is_mandatory: true,
        status: 'active',
        category_id: category.id,
        description:
          'Card Testing for Solidity/Peel Strength of the Overlay. ' +
          'Card Edge Data (< 5 mm to Edge). Minimum peel result >= 5 N/cm required.',
      },
    });

    if (!created && record.category_id !== category.id) {
      await record.update({ category_id: category.id });
    }

    console.log(`${created ? '✅ Created' : '⏭️  Exists'}: #3015# - ${record.test_name}`);
    console.log('\n✅ Overlay Peel seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedOverlayPeel();
