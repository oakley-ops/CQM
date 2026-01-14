require('dotenv').config();
const { TestDefinition, TestCategory, sequelize } = require('./models');
const sampleTestDefinitionsData = require('./seed-data/sample-test-definitions.json');

/**
 * Seed Test Definitions for CQM System
 */
async function seedTestDefinitions() {
  try {
    console.log('🌱 Seeding Test Definitions...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Check if test categories exist
      const categoriesCount = await TestCategory.count();
      if (categoriesCount === 0) {
        console.log('⚠️  No test categories found. Please run seed-test-categories.js first.');
        await transaction.rollback();
        return;
      }

      // Get all test categories for mapping
      const categories = await TestCategory.findAll();
      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });

      console.log(`✅ Found ${categoriesCount} test categories\n`);

      // Clear existing test definitions
      const existingCount = await TestDefinition.count();
      if (existingCount > 0) {
        console.log(`⚠️  Found ${existingCount} existing test definitions`);
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise(resolve => {
          readline.question('Do you want to clear existing data? (yes/no): ', resolve);
        });
        readline.close();

        if (answer.toLowerCase() === 'yes') {
          await TestDefinition.destroy({ where: {}, transaction });
          console.log('🗑️  Cleared existing test definitions\n');
        } else {
          console.log('⏭️  Skipping, keeping existing data\n');
          await transaction.rollback();
          return;
        }
      }

      // Prepare comprehensive test definitions
      const testDefinitions = [
        // Physical Tests (ISO 7810)
        {
          category_id: categoryMap['Physical Tests (ISO 7810)'],
          test_id: 'PHY-TOX-001',
          test_name: 'Toxicity Testing',
          short_name: 'Toxicity Test',
          iso_standard: 'ISO 7810',
          standard_section: 'Annex A',
          description: 'Verify that card materials are non-toxic and safe for handling according to ISO 7810 specifications.',
          purpose: 'Ensure cardholder safety by verifying absence of toxic materials',
          test_type: 'Safety',
          procedure: 'Perform chemical analysis on card materials according to ISO 7810 Annex A. Test for presence of heavy metals, toxic compounds, and harmful substances.',
          test_method: 'Chemical composition analysis using spectroscopy',
          test_conditions: 'Room temperature (23°C ± 2°C), standard laboratory conditions',
          test_duration: '24 hours',
          sample_size: 3,
          sampling_method: 'Random sampling from production batch',
          equipment_required: 'Spectroscope, Chemical analysis equipment',
          pass_criteria: 'All material components comply with toxicity limits defined in ISO 7810',
          expected_result: 'No toxic substances detected above specified limits',
          measurement_type: 'Pass/Fail',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: true,
          risk_level: 'Critical',
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['Physical Tests (ISO 7810)'],
          test_id: 'PHY-CHEM-001',
          test_name: 'Resistance to Chemicals - Acids',
          short_name: 'Acid Resistance',
          iso_standard: 'ISO 7810',
          standard_section: 'Section 6.3',
          description: 'Assess the card\'s resistance to common acidic chemicals that may be encountered during use.',
          purpose: 'Verify card durability against chemical exposure',
          test_type: 'Chemical Resistance',
          procedure: 'Immerse card in 10% HCl solution for 24 hours at room temperature. Remove, rinse, dry, and inspect for damage.',
          test_method: 'Chemical immersion test',
          test_conditions: '23°C ± 2°C, 10% HCl solution',
          test_duration: '24 hours immersion + inspection',
          sample_size: 5,
          equipment_required: 'Chemical bath, HCl solution, inspection equipment',
          pass_criteria: 'Card maintains structural integrity and appearance with no visible damage, discoloration, or delamination',
          expected_result: 'No visible damage, discoloration, or delamination',
          measurement_type: 'Visual Inspection',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: true,
          risk_level: 'High',
          safety_precautions: 'Handle HCl with proper protective equipment. Work in ventilated area.',
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['Physical Tests (ISO 7810)'],
          test_id: 'PHY-DIM-001',
          test_name: 'Card Dimensions Verification',
          short_name: 'Dimensions',
          iso_standard: 'ISO 7810',
          standard_section: 'Section 5.1',
          description: 'Verify that card dimensions comply with ID-1 card format specifications.',
          purpose: 'Ensure card fits standard readers and wallets',
          test_type: 'Dimensional',
          procedure: 'Measure card length, width, thickness, and corner radius using calibrated measuring equipment.',
          test_method: 'Precision measurement',
          test_conditions: '23°C ± 2°C, 50% ± 5% RH',
          test_duration: '15 minutes per card',
          sample_size: 10,
          equipment_required: 'Digital calipers (0.01mm accuracy), radius gauge',
          calibration_required: true,
          calibration_frequency: 'Annually',
          pass_criteria: 'Length: 85.60mm ± 0.12mm, Width: 53.98mm ± 0.055mm, Thickness: 0.76mm ± 0.08mm, Corner radius: 3.18mm ± 0.30mm',
          measurement_type: 'Numeric',
          unit_of_measurement: 'mm',
          target_value: 85.60,
          min_acceptable_value: 85.48,
          max_acceptable_value: 85.72,
          tolerance: 0.12,
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'Critical',
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['Physical Tests (ISO 7810)']  ,
          test_id: 'PHY-WARP-001',
          test_name: 'Warpage Testing',
          short_name: 'Warpage',
          iso_standard: 'ISO 7810',
          standard_section: 'Section 6.2',
          description: 'Measure card warpage to ensure flatness within acceptable limits.',
          purpose: 'Ensure card remains flat for proper reader acceptance',
          test_type: 'Dimensional',
          procedure: 'Place card on flat surface and measure maximum deviation from plane using height gauge.',
          test_method: 'Flatness measurement',
          test_conditions: '23°C ± 2°C, 50% ± 5% RH',
          test_duration: '10 minutes per card',
          sample_size: 10,
          equipment_required: 'Flat glass surface, height gauge (0.01mm accuracy)',
          pass_criteria: 'Maximum warpage ≤ 0.5mm in longitudinal direction, ≤ 0.3mm in transverse direction',
          measurement_type: 'Numeric',
          unit_of_measurement: 'mm',
          max_acceptable_value: 0.5,
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'High',
          version: '1.0',
          status: 'Active'
        },

        // Smart Card Tests (ISO 7816-1)
        {
          category_id: categoryMap['Smart Card Tests (ISO 7816-1)'],
          test_id: 'SMT-UV-001',
          test_name: 'Ultra-violet Light Exposure',
          short_name: 'UV Exposure',
          iso_standard: 'ISO 7816-1',
          standard_section: 'Section 8.3',
          description: 'Test card resistance to UV light exposure to verify long-term stability.',
          purpose: 'Ensure card remains functional after UV exposure',
          test_type: 'Environmental',
          procedure: 'Expose card to UV light (wavelength 315nm) for specified duration. Test functionality before and after.',
          test_method: 'UV chamber exposure',
          test_conditions: 'UV wavelength 315nm, intensity 15 W/m²',
          test_duration: '168 hours (7 days)',
          sample_size: 5,
          equipment_required: 'UV chamber, card reader for pre/post test',
          pass_criteria: 'Card maintains full functionality with no data loss or contact degradation',
          expected_result: 'No functional degradation or visible damage to contacts',
          measurement_type: 'Pass/Fail',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'High',
          safety_precautions: 'Do not expose eyes to UV light. Use protective equipment.',
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['Smart Card Tests (ISO 7816-1)'],
          test_id: 'SMT-XRAY-001',
          test_name: 'X-ray Exposure',
          short_name: 'X-ray Test',
          iso_standard: 'ISO 7816-1',
          standard_section: 'Section 8.4',
          description: 'Verify card functionality after X-ray exposure typical in airport security.',
          purpose: 'Ensure card survives airport X-ray scanning',
          test_type: 'Environmental',
          procedure: 'Expose card to X-ray radiation at specified dose. Verify functionality after exposure.',
          test_method: 'X-ray exposure test',
          test_conditions: 'X-ray dose: 0.1 Gy (typical airport scanner)',
          test_duration: '10 exposures',
          sample_size: 5,
          equipment_required: 'X-ray source, dosimeter, card reader',
          pass_criteria: 'Card maintains full functionality with no data corruption',
          expected_result: 'No functional impact from X-ray exposure',
          measurement_type: 'Pass/Fail',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'Medium',
          safety_precautions: 'X-ray testing must be performed by qualified personnel with proper shielding.',
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['Smart Card Tests (ISO 7816-1)'],
          test_id: 'SMT-CONT-001',
          test_name: 'Contact Surface Profile',
          short_name: 'Contact Profile',
          iso_standard: 'ISO 7816-1',
          standard_section: 'Section 5.2',
          description: 'Verify the surface profile and positioning of smart card contacts.',
          purpose: 'Ensure proper electrical contact with readers',
          test_type: 'Dimensional',
          procedure: 'Measure contact dimensions, positioning, and surface profile using microscope and profilometer.',
          test_method: 'Microscopic measurement',
          test_conditions: 'Standard laboratory conditions',
          test_duration: '30 minutes per card',
          sample_size: 10,
          equipment_required: 'Microscope, profilometer, contact template',
          calibration_required: true,
          pass_criteria: 'Contact dimensions and positioning within ISO 7816-2 specifications',
          measurement_type: 'Numeric',
          unit_of_measurement: 'mm',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'Critical',
          version: '1.0',
          status: 'Active'
        },

        // EMV Chip Functionality
        {
          category_id: categoryMap['EMV Chip Functionality'],
          test_id: 'EMV-CHIP-001',
          test_name: 'EMV Chip Functionality Verification',
          short_name: 'Chip Verification',
          iso_standard: 'EMVCo L1',
          description: 'Verify basic EMV chip communication and command processing according to EMVCo Level 1 specifications.',
          purpose: 'Ensure chip responds correctly to EMV commands',
          test_type: 'Functional',
          procedure: 'Execute a series of EMV L1 commands including SELECT, GET PROCESSING OPTIONS, READ RECORD. Verify correct responses per EMVCo specifications.',
          test_method: 'EMV command sequence testing',
          test_conditions: 'Standard reader environment, 5V or 3V power supply',
          test_duration: '5 minutes per card',
          sample_size: 20,
          equipment_required: 'EMVCo certified card reader/terminal',
          calibration_required: true,
          calibration_frequency: 'Annually',
          pass_criteria: 'All command-response pairs match EMVCo L1 requirements. ATR, PPS, and protocol parameters correct.',
          expected_result: 'Chip responds correctly to all commands as per EMVCo specifications',
          measurement_type: 'Pass/Fail',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'Critical',
          reference_documents: ['EMVCo Level 1 Type Approval', 'EMVCo Contact Interface Specifications'],
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['EMV Chip Functionality'],
          test_id: 'EMV-ELEC-001',
          test_name: 'Electrical Interface Testing',
          short_name: 'Electrical Interface',
          iso_standard: 'EMVCo L1',
          description: 'Test electrical characteristics of the chip interface including voltage, current, and timing.',
          purpose: 'Verify electrical compliance with EMVCo standards',
          test_type: 'Electrical',
          procedure: 'Measure supply voltage, clock frequency, I/O signal levels, and current consumption during various operations.',
          test_method: 'Oscilloscope and multimeter measurements',
          test_conditions: 'Class A (5V), Class B (3V), Class C (1.8V)',
          test_duration: '15 minutes per card',
          sample_size: 10,
          equipment_required: 'Oscilloscope, multimeter, EMV test system',
          pass_criteria: 'Voltage levels, timing, and current within EMVCo L1 specifications',
          measurement_type: 'Numeric',
          unit_of_measurement: 'V/mA',
          is_mandatory: true,
          is_cqm_required: true,
          is_destructive: false,
          risk_level: 'High',
          version: '1.0',
          status: 'Active'
        },

        // Magnetic Stripe Tests
        {
          category_id: categoryMap['Magnetic Stripe Tests'],
          test_id: 'MAG-ENC-001',
          test_name: 'Magnetic Stripe Encoding Quality',
          short_name: 'Encoding Quality',
          iso_standard: 'ISO 7811-2',
          standard_section: 'Section 6',
          description: 'Evaluate the quality and readability of data encoded on the magnetic stripe.',
          purpose: 'Ensure reliable magnetic stripe read operations',
          test_type: 'Performance',
          procedure: 'Encode test data on tracks 1, 2, and 3. Perform 100 read attempts using a standard reader. Measure signal amplitude and decode error rate.',
          test_method: 'Read reliability testing',
          test_conditions: '23°C ± 2°C, 50% ± 5% RH',
          test_duration: '100 read cycles',
          sample_size: 20,
          equipment_required: 'Magnetic stripe encoder, reader, signal analyzer',
          calibration_required: true,
          pass_criteria: 'Read reliability rate ≥ 99.9% (maximum 1 error in 1000 reads)',
          expected_result: 'Data is read correctly in 100% of attempts',
          measurement_type: 'Percentage',
          unit_of_measurement: '%',
          target_value: 100,
          min_acceptable_value: 99.9,
          is_mandatory: false,
          is_cqm_required: false,
          is_destructive: false,
          risk_level: 'High',
          version: '1.0',
          status: 'Active'
        },
        {
          category_id: categoryMap['Magnetic Stripe Tests'],
          test_id: 'MAG-COER-001',
          test_name: 'Coercivity Measurement',
          short_name: 'Coercivity',
          iso_standard: 'ISO 7811-2',
          description: 'Measure the magnetic coercivity of the magnetic stripe material.',
          purpose: 'Verify correct magnetic stripe material specification',
          test_type: 'Physical',
          procedure: 'Use coercivity meter to measure the magnetic coercivity of tracks 1, 2, and 3.',
          test_method: 'Magnetic property measurement',
          test_conditions: 'Room temperature',
          test_duration: '5 minutes per card',
          sample_size: 10,
          equipment_required: 'Coercivity meter',
          pass_criteria: 'HiCo: 2750 Oe ± 300 Oe, LoCo: 300 Oe ± 50 Oe',
          measurement_type: 'Numeric',
          unit_of_measurement: 'Oe',
          target_value: 2750,
          tolerance: 300,
          is_mandatory: false,
          is_cqm_required: false,
          is_destructive: false,
          risk_level: 'Medium',
          version: '1.0',
          status: 'Active'
        }
      ];

      // Insert test definitions
      const createdDefinitions = await TestDefinition.bulkCreate(testDefinitions, { transaction });

      console.log(`✅ Successfully created ${createdDefinitions.length} test definitions:\n`);
      
      // Group by category
      const byCategory = {};
      createdDefinitions.forEach(def => {
        const catName = categories.find(c => c.id === def.category_id)?.name || 'Unknown';
        if (!byCategory[catName]) byCategory[catName] = [];
        byCategory[catName].push(def.test_id);
      });

      Object.keys(byCategory).forEach(catName => {
        console.log(`\n   ${catName}:`);
        byCategory[catName].forEach(testId => {
          console.log(`      - ${testId}`);
        });
      });

      // Commit transaction
      await transaction.commit();

      console.log('\n\n🎉 Test definitions seeded successfully!\n');
      console.log('📊 Summary:');
      console.log(`   Total Test Definitions: ${createdDefinitions.length}`);
      console.log(`   Mandatory Tests: ${createdDefinitions.filter(t => t.is_mandatory).length}`);
      console.log(`   Optional Tests: ${createdDefinitions.filter(t => !t.is_mandatory).length}`);
      console.log(`   Destructive Tests: ${createdDefinitions.filter(t => t.is_destructive).length}`);
      console.log(`   Non-Destructive Tests: ${createdDefinitions.filter(t => !t.is_destructive).length}`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error seeding test definitions:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the seed function
if (require.main === module) {
  seedTestDefinitions();
}

module.exports = seedTestDefinitions;



