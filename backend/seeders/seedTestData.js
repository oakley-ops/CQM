/**
 * Seed script for Test Categories and Definitions
 * Run with: node backend/seeders/seedTestData.js
 */

require('dotenv').config();
const { sequelize, TestCategory, TestDefinition } = require('../models');

const categories = [
  {
    category_code: 'ICM',
    name: 'Module Manufacturer Tests',
    description: 'Section 4 - Module manufacturer quality tests',
    iso_standard: 'ISO7816',
    display_order: 1,
    is_active: true,
    icon: 'memory'
  },
  {
    category_code: 'CB',
    name: 'Card Body Fabrication Tests',
    description: 'Section 5 - Card body fabrication quality tests',
    iso_standard: 'ISO7810',
    display_order: 2,
    is_active: true,
    icon: 'layers'
  },
  {
    category_code: 'ICC',
    name: 'Card Embedder Tests',
    description: 'Section 6 - Card embedder quality tests',
    iso_standard: 'ISO7816',
    display_order: 3,
    is_active: true,
    icon: 'credit_card'
  },
  {
    category_code: 'PHYS',
    name: 'Physical Test Methods',
    description: 'Section 10 - Physical test methods',
    iso_standard: 'ISO10373',
    display_order: 4,
    is_active: true,
    icon: 'straighten'
  },
  {
    category_code: 'MAG',
    name: 'Magnetic Stripe Tests',
    description: 'Section 11 - Magnetic stripe tests',
    iso_standard: 'ISO7811',
    display_order: 5,
    is_active: true,
    icon: 'settings'
  },
  {
    category_code: 'PERS',
    name: 'Personalization Tests',
    description: 'Section 12 - Personalization tests',
    iso_standard: 'ISO7810',
    display_order: 6,
    is_active: true,
    icon: 'person'
  },
  {
    category_code: 'PICC',
    name: 'Contactless Tests',
    description: 'Section 16 - Contactless card tests',
    iso_standard: 'ISO14443',
    display_order: 7,
    is_active: true,
    icon: 'nfc'
  }
];

const testDefinitions = {
  ICM: [
    { test_id: '4.1.1', test_name: 'Toxicity [ISO7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '4.1.2', test_name: 'Resistance to chemicals [ISO7810]', test_type: 'assessment', iso_standard: 'ISO7810' },
    { test_id: '4.1.3', test_name: 'Durability', test_type: 'measurement', unit_of_measurement: 'cycles' },
    { test_id: '4.1.4', test_name: 'Delamination/Solidity', test_type: 'passfail' },
    { test_id: '4.1.5', test_name: 'Ultra-violet light [ISO7816-1]', test_type: 'passfail', iso_standard: 'ISO7816-1' },
    { test_id: '4.1.6', test_name: 'X Rays [ISO7816-1]', test_type: 'passfail', iso_standard: 'ISO7816-1' },
    { test_id: '4.1.7', test_name: 'Surface Profile of contacts [ISO7816-1]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7816-1' },
    { test_id: '4.1.8', test_name: 'Mechanical resistance of contacts [ISO7816-1]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7816-1' },
    { test_id: '4.1.9', test_name: 'Electrical resistance of contacts [ISO7816-1]', test_type: 'measurement', unit_of_measurement: 'Ohm', iso_standard: 'ISO7816-1' },
    { test_id: '4.5.1', test_name: 'Resistance to Chemicals [10373-1]', test_type: 'passfail', iso_standard: 'ISO10373-1' },
    { test_id: '4.5.2', test_name: 'Durability', test_type: 'passfail' },
    { test_id: '4.5.3', test_name: 'Delamination', test_type: 'passfail' },
    { test_id: '4.5.4', test_name: 'Electrical resistance of contacts [ISO7816-1]', test_type: 'measurement', unit_of_measurement: 'Ohm', iso_standard: 'ISO7816-1' },
    { test_id: '4.5.5', test_name: 'Dimensions and relative position of contacts', test_type: 'measurement', unit_of_measurement: 'mm' }
  ],
  CB: [
    { test_id: '5.1.2', test_name: 'Width and Height [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810', min_acceptable_value: 85.47, max_acceptable_value: 85.72 },
    { test_id: '5.1.3', test_name: 'CB Thickness Outside Contacts [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '5.1.4', test_name: 'Thickness within Add-On Areas', test_type: 'measurement', unit_of_measurement: 'mm' },
    { test_id: '5.1.5', test_name: 'Corners [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '5.1.6', test_name: 'CB Edges [ISO7810]', test_type: 'assessment', iso_standard: 'ISO7810' },
    { test_id: '5.1.7', test_name: 'Bending Stiffness [ISO7810]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7810' },
    { test_id: '5.1.8', test_name: 'Durability [ISO7810]', test_type: 'measurement', unit_of_measurement: 'cycles', iso_standard: 'ISO7810' },
    { test_id: '5.1.9', test_name: 'Overall CB Warpage [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810', max_acceptable_value: 2.0 },
    { test_id: '5.1.10', test_name: 'Heat Resistance [ISO7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '5.1.11', test_name: 'Solidity/Peel Strength [ISO7810]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7810' },
    { test_id: '5.1.12', test_name: 'Adhesion or Blocking [ISO7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '5.1.13', test_name: 'Dynamic Bending Stress [ISO7816-1]', test_type: 'passfail', iso_standard: 'ISO7816-1' },
    { test_id: '5.1.14', test_name: 'Dynamic Torsional Stress [ISO7816-1]', test_type: 'passfail', iso_standard: 'ISO7816-1' },
    { test_id: '5.1.15', test_name: 'Resistance to Impact', test_type: 'passfail', iso_standard: 'ANSI NCITS 322' },
    { test_id: '5.1.16', test_name: 'Resistance to Corner Impact', test_type: 'passfail', iso_standard: 'ANSI NCITS 322' },
    { test_id: '5.1.17', test_name: 'Resistance to Surface abrasion', test_type: 'passfail', iso_standard: 'ANSI NCITS 322' },
    { test_id: '5.1.18', test_name: 'Toxicity [ISO7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '5.1.19', test_name: 'Resistance to Chemicals [ISO7810]', test_type: 'assessment', iso_standard: 'ISO7810' },
    { test_id: '5.1.20', test_name: 'Light [ISO7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '5.1.21', test_name: 'Opacity [ISO7810]', test_type: 'measurement', unit_of_measurement: '%', iso_standard: 'ISO7810' }
  ],
  ICC: [
    { test_id: '6.1.1', test_name: 'Width and Height [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '6.1.2', test_name: 'ICC Thickness Outside Contacts [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '6.1.3', test_name: 'Thickness within Add-On Areas', test_type: 'measurement', unit_of_measurement: 'mm' },
    { test_id: '6.1.4', test_name: 'Bending Stiffness [ISO7810]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7810' },
    { test_id: '6.1.5', test_name: 'Durability', test_type: 'measurement', unit_of_measurement: 'cycles' },
    { test_id: '6.1.6', test_name: 'Overall ICC Warpage [ISO7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '6.1.7', test_name: 'Toxicity [ISO7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '6.1.8', test_name: 'Resistance to Chemicals [ISO7810]', test_type: 'assessment', iso_standard: 'ISO7810' },
    { test_id: '6.1.9', test_name: 'Relative height of contacts [EMV]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'EMV' },
    { test_id: '6.1.10', test_name: 'Contact Layout', test_type: 'passfail' },
    { test_id: '6.1.11', test_name: 'Mechanical reliability', test_type: 'passfail' },
    { test_id: '6.1.12', test_name: 'Solidity/Adhesion of module to card', test_type: 'measurement', unit_of_measurement: 'N' }
  ],
  PHYS: [
    { test_id: '10.3.2', test_name: 'Width and height [ISO10373-1]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.3', test_name: 'Card thickness outside Contacts [ISO10373-1]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.4', test_name: 'Thickness within Add-On Areas', test_type: 'measurement', unit_of_measurement: 'mm' },
    { test_id: '10.3.5', test_name: 'Corners', test_type: 'measurement', unit_of_measurement: 'mm' },
    { test_id: '10.3.6', test_name: 'Card edges', test_type: 'assessment' },
    { test_id: '10.3.7', test_name: 'Bending stiffness [ISO10373-1]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.8', test_name: 'Durability', test_type: 'measurement', unit_of_measurement: 'cycles' },
    { test_id: '10.3.9', test_name: 'Overall Card warpage [ISO10373-1]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.10', test_name: 'Heat resistance', test_type: 'passfail' },
    { test_id: '10.3.11', test_name: 'Peel strength [ISO10373-1]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.12', test_name: 'Adhesion or blocking [ISO10373-1]', test_type: 'passfail', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.13', test_name: 'Dynamic bending stress [ISO10373-1]', test_type: 'passfail', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.14', test_name: 'Dynamic torsional stress [ISO10373-1]', test_type: 'passfail', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.15', test_name: 'Impact resistance', test_type: 'passfail' },
    { test_id: '10.3.16', test_name: 'Corner Impact test', test_type: 'passfail' },
    { test_id: '10.3.17', test_name: 'Surface abrasion resistance', test_type: 'passfail', iso_standard: 'ANSI NCITS 322' },
    { test_id: '10.3.18', test_name: 'Toxicity', test_type: 'passfail' },
    { test_id: '10.3.19', test_name: 'Resistance to chemicals [ISO10373-1]', test_type: 'assessment', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.20', test_name: 'Light', test_type: 'passfail' },
    { test_id: '10.3.21', test_name: 'Opacity [ISO10373-1]', test_type: 'measurement', unit_of_measurement: '%', iso_standard: 'ISO10373-1' },
    { test_id: '10.3.22', test_name: 'Three Wheels Test', test_type: 'passfail' },
    { test_id: '10.3.23', test_name: 'Mechanical Reliability: Wrapping test', test_type: 'passfail' }
  ],
  MAG: [
    { test_id: '11.1.2', test_name: 'Location of Magnetic stripe [ISO7811]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7811' },
    { test_id: '11.1.3', test_name: 'Magnetic stripe area warpage [ISO7811-2]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7811-2' },
    { test_id: '11.1.4', test_name: 'Magnetic stripe surface distortions [ISO7811-2]', test_type: 'assessment', iso_standard: 'ISO7811-2' },
    { test_id: '11.1.5', test_name: 'Magnetic stripe surface roughness [ISO7811]', test_type: 'measurement', unit_of_measurement: 'um', iso_standard: 'ISO7811' },
    { test_id: '11.1.6', test_name: 'Solidity/Adhesion of stripe to card [ISO7811]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7811' },
    { test_id: '11.1.7', test_name: 'Resistance of magnetic stripe to abrasion', test_type: 'passfail', iso_standard: 'ANSI NCITS 322' },
    { test_id: '11.1.8', test_name: 'Wear from read/write head [ISO7811]', test_type: 'passfail', iso_standard: 'ISO7811' },
    { test_id: '11.5.1', test_name: 'Printing Specifications', test_type: 'passfail' },
    { test_id: '11.5.2', test_name: 'Pantone Colours', test_type: 'assessment' },
    { test_id: '11.5.3', test_name: 'Metallic Colours', test_type: 'assessment' },
    { test_id: '11.5.4', test_name: 'Registration and Positioning', test_type: 'measurement', unit_of_measurement: 'mm' },
    { test_id: '11.5.5', test_name: 'Printing Aspect', test_type: 'assessment' },
    { test_id: '11.5.6', test_name: 'Card Aspect', test_type: 'assessment' },
    { test_id: '11.5.7', test_name: 'Security Devices', test_type: 'assessment' }
  ],
  PERS: [
    { test_id: '12.1.1', test_name: 'Embossing', test_type: 'assessment' },
    { test_id: '12.1.2', test_name: 'Indent printing', test_type: 'assessment' },
    { test_id: '12.1.3', test_name: 'Thermal Transfer', test_type: 'assessment' },
    { test_id: '12.1.4', test_name: 'Laser Engraving', test_type: 'assessment' },
    { test_id: '12.1.5', test_name: 'Mechanical reliability of personalized card', test_type: 'passfail' },
    { test_id: '12.1.6', test_name: 'Encoding of the magstripe', test_type: 'passfail' },
    { test_id: '12.3.1', test_name: 'Durability of tipping', test_type: 'passfail' },
    { test_id: '12.3.2', test_name: 'Embossed Character Relief Height Retention', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ANSI NCITS 322' },
    { test_id: '12.3.3', test_name: 'Durability of indent/thermal/laser', test_type: 'assessment' },
    { test_id: '12.3.4', test_name: 'Mechanical Reliability: Residual stress', test_type: 'passfail' },
    { test_id: '12.3.5', test_name: 'Integrity of Character reproduction', test_type: 'assessment' }
  ],
  PICC: [
    { test_id: '16.1.2', test_name: 'Width and Height [ISO-7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '16.1.3', test_name: 'PICC Thickness Outside Embossed Areas [ISO-7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '16.1.4', test_name: 'Thickness within Add-On Areas', test_type: 'measurement', unit_of_measurement: 'mm' },
    { test_id: '16.1.5', test_name: 'Corners [ISO-7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '16.1.6', test_name: 'Card Edges [ISO-7810]', test_type: 'assessment', iso_standard: 'ISO7810' },
    { test_id: '16.1.7', test_name: 'Bending Stiffness [ISO-7810]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7810' },
    { test_id: '16.1.8', test_name: 'Durability', test_type: 'measurement', unit_of_measurement: 'cycles' },
    { test_id: '16.1.9', test_name: 'Overall PICC Warpage [ISO-7810]', test_type: 'measurement', unit_of_measurement: 'mm', iso_standard: 'ISO7810' },
    { test_id: '16.1.10', test_name: 'Heat Resistance [ISO-7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '16.1.11', test_name: 'Peel Strength [ISO-7810]', test_type: 'measurement', unit_of_measurement: 'N', iso_standard: 'ISO7810' },
    { test_id: '16.1.12', test_name: 'Adhesion or Blocking [ISO-7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '16.1.13', test_name: 'Resistance to Surface abrasion', test_type: 'passfail', iso_standard: 'ANSI NCITS 322' },
    { test_id: '16.1.14', test_name: 'Toxicity [ISO-7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '16.1.15', test_name: 'Resistance to Chemicals [ISO-7810]', test_type: 'assessment', iso_standard: 'ISO7810' },
    { test_id: '16.1.16', test_name: 'Light [ISO-7810]', test_type: 'passfail', iso_standard: 'ISO7810' },
    { test_id: '16.1.17', test_name: 'Opacity [ISO-7810]', test_type: 'measurement', unit_of_measurement: '%', iso_standard: 'ISO7810' },
    { test_id: '16.1.18', test_name: 'Mechanical Robustness and Reliability', test_type: 'passfail' },
    { test_id: '16.1.19', test_name: 'Antenna and Module Design, forbidden zone', test_type: 'passfail' },
    { test_id: '16.4.1', test_name: 'Surface irregularities', test_type: 'assessment' },
    { test_id: '16.4.2', test_name: 'Surface Stability', test_type: 'passfail' },
    { test_id: '16.4.3', test_name: 'Rotary stress', test_type: 'passfail' },
    { test_id: '16.4.4', test_name: 'Tensile stress', test_type: 'passfail' }
  ]
};

async function seedTestData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully.');

    // Seed categories
    console.log('\nSeeding test categories...');
    const createdCategories = {};

    for (const cat of categories) {
      const [category, created] = await TestCategory.findOrCreate({
        where: { category_code: cat.category_code },
        defaults: cat
      });
      createdCategories[cat.category_code] = category;
      console.log(`  ${created ? 'Created' : 'Found'} category: ${cat.name}`);
    }

    // Seed definitions
    console.log('\nSeeding test definitions...');
    let totalCreated = 0;

    for (const [categoryCode, defs] of Object.entries(testDefinitions)) {
      const category = createdCategories[categoryCode];
      if (!category) {
        console.log(`  Warning: Category ${categoryCode} not found, skipping definitions`);
        continue;
      }

      for (const def of defs) {
        const [, created] = await TestDefinition.findOrCreate({
          where: { test_id: def.test_id },
          defaults: {
            ...def,
            category_id: category.id,
            iso_standard: def.iso_standard || category.iso_standard,
            description: def.test_name,
            procedure: `Standard procedure for ${def.test_name}`,
            pass_criteria: 'Must meet specifications',
            fail_criteria: 'Does not meet specifications',
            expected_result: 'Pass',
            is_mandatory: true,
            status: 'active',
            version: '1.0'
          }
        });
        if (created) totalCreated++;
      }
      console.log(`  Category ${categoryCode}: ${defs.length} definitions`);
    }

    const totalDefs = Object.values(testDefinitions).flat().length;
    console.log(`\nSeed complete!`);
    console.log(`  Categories: ${categories.length}`);
    console.log(`  Definitions: ${totalCreated} new (${totalDefs} total)`);

  } catch (error) {
    console.error('Error seeding test data:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedTestData();
