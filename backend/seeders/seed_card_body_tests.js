const { TestCategory, TestDefinition, TestParameter } = require('../models');

/**
 * Seed Card Body Fabrication Tests
 * Creates test definitions for Infrastructure Quality Requirements for Card Body Fabrication
 * Section 5 - 21 comprehensive tests
 */

const cardBodyTestsData = {
  category: {
    category_code: 'CB',
    category_name: 'Card Body Fabrication',
    description: 'Infrastructure quality requirements for Card Body Fabrication. Tests physical card body manufacturing quality before module embedding.',
    display_order: 2,
    is_active: true
  },
  
  tests: [
    {
      test_code: '5.1.2',
      test_name: 'Width and Height',
      description: 'Measure card body width and height dimensions',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 5,
      required_equipment: 'Digital caliper or micrometer (0.01mm accuracy)',
      parameters: [
        {
          parameter_name: 'Width',
          data_type: 'Numeric',
          expected_value: 85.60,
          tolerance: 0.12,
          min_value: 85.48,
          max_value: 85.72,
          unit: 'mm',
          required: true,
          display_order: 1,
          help_text: 'Measure the card width at multiple points, use average'
        },
        {
          parameter_name: 'Height',
          data_type: 'Numeric',
          expected_value: 53.98,
          tolerance: 0.055,
          min_value: 53.925,
          max_value: 54.035,
          unit: 'mm',
          required: true,
          display_order: 2,
          help_text: 'Measure the card height at multiple points, use average'
        }
      ]
    },
    {
      test_code: '5.1.3',
      test_name: 'CB Thickness Outside Contacts, Embossed Areas and Add-On Areas',
      description: 'Measure card body thickness in standard areas (not contacts or embossing)',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 5,
      required_equipment: 'Thickness gauge (0.01mm accuracy)',
      parameters: [
        {
          parameter_name: 'Thickness',
          data_type: 'Numeric',
          expected_value: 0.76,
          tolerance: 0.08,
          min_value: 0.68,
          max_value: 0.84,
          unit: 'mm',
          required: true,
          display_order: 1,
          help_text: 'Measure at center of card, away from any raised areas'
        }
      ]
    },
    {
      test_code: '5.1.4',
      test_name: 'Thickness within Add-On Areas',
      description: 'Measure card thickness in areas with add-on features (signatures, holograms)',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 5,
      required_equipment: 'Thickness gauge (0.01mm accuracy)',
      parameters: [
        {
          parameter_name: 'Maximum Thickness',
          data_type: 'Numeric',
          expected_value: null,
          tolerance: null,
          min_value: null,
          max_value: 1.00,
          unit: 'mm',
          required: true,
          display_order: 1,
          help_text: 'Measure at thickest point of add-on area'
        }
      ]
    },
    {
      test_code: '5.1.5',
      test_name: 'Corners',
      description: 'Verify corner radius meets specifications',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 5,
      required_equipment: 'Radius gauge or template',
      parameters: [
        {
          parameter_name: 'Corner Radius',
          data_type: 'Numeric',
          expected_value: 3.18,
          tolerance: 0.30,
          min_value: 2.88,
          max_value: 3.48,
          unit: 'mm',
          required: true,
          display_order: 1,
          help_text: 'Check all four corners, all must be within tolerance'
        }
      ]
    },
    {
      test_code: '5.1.6',
      test_name: 'CB Edges',
      description: 'Visual inspection of card edges for smoothness and uniformity',
      iso_standard: 'ISO7810',
      measurement_type: 'Visual',
      frequency: 'Per Batch',
      test_duration_minutes: 3,
      required_equipment: 'Visual inspection, magnifying glass (optional)',
      parameters: [
        {
          parameter_name: 'Edge Quality',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'Edges must be smooth, no burrs or delamination visible',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.7',
      test_name: 'Bending Stiffness',
      description: 'Measure card resistance to bending',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 10,
      required_equipment: 'Bending stiffness tester',
      parameters: [
        {
          parameter_name: 'Longitudinal Stiffness',
          data_type: 'Numeric',
          expected_value: null,
          tolerance: null,
          min_value: 20,
          max_value: 140,
          unit: 'mN⋅m',
          required: true,
          display_order: 1,
          help_text: 'Measure along length of card'
        },
        {
          parameter_name: 'Transverse Stiffness',
          data_type: 'Numeric',
          expected_value: null,
          tolerance: null,
          min_value: 10,
          max_value: 70,
          unit: 'mN⋅m',
          required: true,
          display_order: 2,
          help_text: 'Measure across width of card'
        }
      ]
    },
    {
      test_code: '5.1.8',
      test_name: 'Durability',
      description: 'Test card resistance to repeated flexing',
      iso_standard: 'ISO7810',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 30,
      required_equipment: 'Durability testing machine (flexing apparatus)',
      parameters: [
        {
          parameter_name: 'Durability Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'Card must withstand 1000 flex cycles without damage',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.9',
      test_name: 'Overall CB Warpage',
      description: 'Measure card flatness/warpage',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 5,
      required_equipment: 'Flatness gauge or straight edge with feeler gauges',
      parameters: [
        {
          parameter_name: 'Maximum Warpage',
          data_type: 'Numeric',
          expected_value: null,
          tolerance: null,
          min_value: null,
          max_value: 3.0,
          unit: 'mm',
          required: true,
          display_order: 1,
          help_text: 'Measure deviation from flat surface at worst point'
        }
      ]
    },
    {
      test_code: '5.1.10',
      test_name: 'Heat Resistance',
      description: 'Test card stability at elevated temperature',
      iso_standard: 'ISO7810',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 180,
      required_equipment: 'Environmental chamber (50°C ± 2°C)',
      parameters: [
        {
          parameter_name: 'Heat Resistance Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No warpage, delamination, or color change after 2hr at 50°C',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.11',
      test_name: 'Solidity / Peel Strength',
      description: 'Measure adhesion between card layers',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 15,
      required_equipment: 'Peel strength tester',
      parameters: [
        {
          parameter_name: 'Peel Strength',
          data_type: 'Numeric',
          expected_value: null,
          tolerance: null,
          min_value: 30,
          max_value: null,
          unit: 'N/25mm',
          required: true,
          display_order: 1,
          help_text: 'Minimum 30N per 25mm width'
        }
      ]
    },
    {
      test_code: '5.1.12',
      test_name: 'Adhesion or Blocking',
      description: 'Test for unwanted adhesion between stacked cards',
      iso_standard: 'ISO7810',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 1440,
      required_equipment: 'Environmental chamber, weight (1kg)',
      parameters: [
        {
          parameter_name: 'Blocking Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'Cards must separate cleanly after 24hr under 1kg at 50°C',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.13',
      test_name: 'Dynamic Bending Stress',
      description: 'Test card performance under dynamic bending loads',
      iso_standard: 'ISO7816-1',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 20,
      required_equipment: 'Dynamic bending test apparatus',
      parameters: [
        {
          parameter_name: 'Bending Stress Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No cracks, delamination after specified cycles',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.14',
      test_name: 'Dynamic Torsional Stress',
      description: 'Test card performance under twisting loads',
      iso_standard: 'ISO7816-1',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 20,
      required_equipment: 'Torsional stress test apparatus',
      parameters: [
        {
          parameter_name: 'Torsional Stress Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No cracks, delamination after torsion cycles',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.15',
      test_name: 'Resistance to Impact',
      description: 'Test card resistance to impact forces',
      iso_standard: 'ANSI NCITS 322',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 10,
      required_equipment: 'Impact tester (25.4mm diameter sphere, 100g, 100mm drop)',
      parameters: [
        {
          parameter_name: 'Impact Resistance Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No cracks or permanent deformation after impact',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.16',
      test_name: 'Resistance to Corner Impact',
      description: 'Test corner resistance to impact forces',
      iso_standard: 'ANSI NCITS 322',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 10,
      required_equipment: 'Corner impact tester',
      parameters: [
        {
          parameter_name: 'Corner Impact Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No corner damage, cracks, or delamination',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.17',
      test_name: 'Resistance to Surface Abrasion',
      description: 'Test card surface resistance to wear',
      iso_standard: 'ANSI NCITS 322',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 30,
      required_equipment: 'Abrasion tester (CS-10 wheels, 1000g load)',
      parameters: [
        {
          parameter_name: 'Abrasion Resistance Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'Surface graphics readable after 500 cycles',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.18',
      test_name: 'Toxicity',
      description: 'Verify card materials meet toxicity standards',
      iso_standard: 'ISO7810',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Material Lot',
      test_duration_minutes: 60,
      required_equipment: 'Toxicity test kit or certified lab analysis',
      parameters: [
        {
          parameter_name: 'Toxicity Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'Materials must meet safety standards for skin contact',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.19',
      test_name: 'Resistance to Chemicals',
      description: 'Test card resistance to common chemicals (water, oils, solvents)',
      iso_standard: 'ISO7810',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Batch',
      test_duration_minutes: 120,
      required_equipment: 'Chemical test kit (water, detergent, isopropanol, etc.)',
      parameters: [
        {
          parameter_name: 'Chemical Resistance Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No discoloration, warpage, or surface damage after exposure',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.20',
      test_name: 'Light',
      description: 'Test card resistance to UV and visible light exposure',
      iso_standard: 'ISO7810',
      measurement_type: 'Pass/Fail',
      frequency: 'Per Material Lot',
      test_duration_minutes: 2400,
      required_equipment: 'UV chamber (300nm-400nm, specified intensity)',
      parameters: [
        {
          parameter_name: 'Light Resistance Result',
          data_type: 'Pass/Fail',
          expected_value: null,
          tolerance: null,
          unit: 'Pass/Fail',
          required: true,
          display_order: 1,
          help_text: 'No significant color fade or material degradation',
          valid_options: ['Pass', 'Fail']
        }
      ]
    },
    {
      test_code: '5.1.21',
      test_name: 'Opacity',
      description: 'Measure card opacity (light transmission)',
      iso_standard: 'ISO7810',
      measurement_type: 'Numeric',
      frequency: 'Per Batch',
      test_duration_minutes: 5,
      required_equipment: 'Opacity meter or light transmission tester',
      parameters: [
        {
          parameter_name: 'Opacity',
          data_type: 'Numeric',
          expected_value: null,
          tolerance: null,
          min_value: 85,
          max_value: 100,
          unit: '%',
          required: true,
          display_order: 1,
          help_text: 'Minimum 85% opacity (maximum 15% light transmission)'
        }
      ]
    }
  ]
};

async function seedCardBodyTests() {
  try {
    console.log('🏗️  Seeding Card Body Fabrication Tests...\n');
    
    // Create or find test category
    const [category, catCreated] = await TestCategory.findOrCreate({
      where: { category_code: cardBodyTestsData.category.category_code },
      defaults: cardBodyTestsData.category
    });
    
    if (catCreated) {
      console.log(`✅ Created category: ${category.category_name}`);
    } else {
      console.log(`ℹ️  Category already exists: ${category.category_name}`);
    }
    
    let testsCreated = 0;
    let parametersCreated = 0;
    
    // Create test definitions and parameters
    for (const testData of cardBodyTestsData.tests) {
      const parameters = testData.parameters;
      delete testData.parameters;
      
      const [testDef, testCreated] = await TestDefinition.findOrCreate({
        where: { 
          category_id: category.id,
          test_code: testData.test_code 
        },
        defaults: {
          ...testData,
          category_id: category.id,
          status: 'Active'
        }
      });
      
      if (testCreated) {
        console.log(`  ✅ Created test: ${testData.test_code} - ${testData.test_name}`);
        testsCreated++;
        
        // Create parameters for this test
        for (const paramData of parameters) {
          const [param, paramCreated] = await TestParameter.findOrCreate({
            where: {
              test_definition_id: testDef.id,
              parameter_name: paramData.parameter_name
            },
            defaults: {
              ...paramData,
              test_definition_id: testDef.id
            }
          });
          
          if (paramCreated) {
            console.log(`     → Parameter: ${paramData.parameter_name} (${paramData.unit})`);
            parametersCreated++;
          }
        }
      } else {
        console.log(`  ℹ️  Test already exists: ${testData.test_code}`);
      }
    }
    
    console.log(`\n✅ Card Body tests seed complete!`);
    console.log(`   Tests created: ${testsCreated}/${cardBodyTestsData.tests.length}`);
    console.log(`   Parameters created: ${parametersCreated}`);
    
  } catch (error) {
    console.error('❌ Error seeding Card Body tests:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const { sequelize } = require('../config/database');
  
  seedCardBodyTests()
    .then(() => {
      console.log('\n✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedCardBodyTests;
