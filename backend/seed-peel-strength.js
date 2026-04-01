/**
 * Seed Peel Strength test definition
 * ISO 7810:2003, Section 8.8
 * Run: cd backend && node seed-peel-strength.js
 */
const { TestCategory, TestDefinition } = require('./models');

async function seedPeelStrength() {
  try {
    console.log('🌱 Seeding Peel Strength (CBY) test...');

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
      where: { test_id: '#3008#' },
      defaults: {
        test_id: '#3008#',
        test_name: 'Peel Strength (Laminate Adhesion)',
        standard_section: '8.8',
        test_method: '#8100#',
        test_frequency: '6/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'N/mm',
        min_acceptable_value: 0.35,
        is_mandatory: true,
        status: 'active',
        category_id: category.id,
        description:
          'Minimum peel force of 0.35 N/mm required for both P1 and P2 measurements per ISO 7810:2003 Section 8.8. ' +
          'Expanded Uncertainty: ±0.01 N (coverage factor k=2, approximate 95% confidence level).',
      },
    });

    if (!created && record.category_id !== category.id) {
      await record.update({ category_id: category.id });
      console.log(`🔄 Updated category for #3008#`);
    }

    console.log(`${created ? '✅ Created' : '⏭️  Exists'}: #3008# - ${record.test_name}`);
    console.log('\n✅ Peel Strength seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedPeelStrength();
