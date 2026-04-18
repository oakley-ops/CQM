/**
 * Seed Internal Testing test definitions
 * Source: CQM Assessment Plan V2.22 — white diamonds
 * Tests are assigned to appropriate existing categories.
 * Run: cd backend && node seed-internal-tests.js
 */
require('dotenv').config();
const { TestCategory, TestDefinition } = require('./models');

async function seedInternalTests() {
  try {
    console.log('🌱 Seeding Internal Testing definitions...\n');

    // Load all existing categories by code for lookup
    const categories = await TestCategory.findAll();
    const byCode = {};
    categories.forEach(c => { byCode[c.category_code] = c; });

    const required = ['PHY', 'CBY', 'MCH', 'ELE'];
    const missing = required.filter(code => !byCode[code]);
    if (missing.length > 0) {
      console.error(`❌ Missing categories: ${missing.join(', ')}. Run seed-test-categories.js first.`);
      process.exit(1);
    }

    const PHY = byCode['PHY'].id;
    const CBY = byCode['CBY'].id;
    const MCH = byCode['MCH'].id;
    const ELE = byCode['ELE'].id;

    // Each entry: { category_id, ...definition fields }
    // test_type: 'measurement' | 'passfail' | 'assessment'
    const definitions = [

      // ── PHY — Physical Tests (ISO 7810) ──────────────────────────────
      {
        category_id: PHY,
        test_id: 'IT-PHY-001',
        test_name: 'Width and Height (IS7810)',
        standard_section: 'IS7810',
        iso_standard: 'ISO 7810',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        is_mandatory: true,
        status: 'active',
        description: 'Verify that card width and height comply with ID-1 format specifications per ISO 7810.',
      },
      {
        category_id: PHY,
        test_id: 'IT-PHY-002',
        test_name: 'Thickness outside Contacts, Embossed Areas and Add-on Areas [IS7810]',
        standard_section: '9.1.3',
        iso_standard: 'ISO 7810',
        test_method: '#8040#: Card Thickness outside Contacts, Embossed Areas and Add-on Areas [IS10373-1]',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        min_acceptable_value: 0.76,
        max_acceptable_value: 0.84,
        sample_size: 8,
        pass_criteria: 'Card thickness outside the ICM area, embossed areas, and Add-on Areas (including the area covered by the magnetic stripe) shall be at least 0.76 mm and never exceed 0.84 mm.',
        is_mandatory: true,
        is_cqm_required: true,
        is_destructive: false,
        status: 'active',
        description: 'Measures the thickness of the card in areas outside the ICM area, embossed areas, and Add-on Areas (e.g. areas covered by signature panels, holograms). The measurement also applies to the embossing area when not embossed and to the future contact area when no ICM is embedded. Areas containing antenna, ICs, or ICM without contacts for contactless communications are not considered Add-on Areas.',
        notes: 'This requirement also applies to the embossing area - as long as it is not embossed - and to the future contact area - as long as no ICM is embedded. Add-on Areas are areas of the card covered by signature panels, holograms, etc. Areas of the CB or pICC containing antenna, ICs or ICM without contacts for contactless communications are not Add-on Areas. Test method defined in ISO/IEC 10373-1 section 13.2.14 ("Thickness of card measurements"). CQM Q-Plan: Qualification Minimum Sample Size = 8; Monitoring = 1 item every Batch.',
      },
      {
        category_id: PHY,
        test_id: 'IT-PHY-003',
        test_name: 'Corners (IS7810)',
        standard_section: 'IS7810',
        iso_standard: 'ISO 7810',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        is_mandatory: true,
        status: 'active',
        description: 'Verify corner radius dimensions comply with ISO 7810 specifications.',
      },
      {
        category_id: PHY,
        test_id: 'IT-PHY-004',
        test_name: 'Thickness within Add-on Areas',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        is_mandatory: true,
        status: 'active',
        description: 'Measure card thickness specifically within add-on areas such as embossing or chip module zones.',
      },
      {
        category_id: PHY,
        test_id: 'IT-PHY-005',
        test_name: 'Opacity of cards with a translucent or transparent core (IS7810)',
        standard_section: 'IS7810',
        iso_standard: 'ISO 7810',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description: 'Assess opacity of cards constructed with a translucent or transparent core per ISO 7810.',
      },
      {
        category_id: PHY,
        test_id: 'IT-PHY-006',
        test_name: 'Overall Card Warpage (IS7810)',
        standard_section: 'IS7810',
        iso_standard: 'ISO 7810',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        is_mandatory: true,
        status: 'active',
        description: 'Measure overall card warpage to ensure flatness within acceptable limits per ISO 7810.',
      },

      // ── CBY — Card Body Construction ──────────────────────────────────
      {
        category_id: CBY,
        test_id: 'IT-CBY-001',
        test_name: 'Solidity – Peel Strength between Core Layers (IS7810)',
        standard_section: 'IS7810',
        iso_standard: 'ISO 7810',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'N',
        is_mandatory: true,
        status: 'active',
        description: 'Measure the peel strength between core laminate layers to verify structural integrity per ISO 7810.',
      },
      {
        category_id: CBY,
        test_id: 'IT-CBY-002',
        test_name: 'Solidity – Resistance to Corner Impact (ANSI NCITS 322 5.20)',
        standard_section: '5.20',
        iso_standard: 'ANSI NCITS 322',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description: 'Test card resistance to corner impact loading per ANSI NCITS 322 section 5.20.',
      },
      {
        category_id: CBY,
        test_id: 'IT-CBY-003',
        test_name: 'Solidity – Peel Strength of the Overlay after Temperature and Humidity Exposure',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'N',
        is_mandatory: true,
        status: 'active',
        description: 'Measure overlay peel strength after temperature and humidity conditioning to verify durability.',
      },
      {
        category_id: CBY,
        test_id: 'IT-CBY-004',
        test_name: 'Solidity – Adhesion of ICM to Card',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description: 'Verify the adhesion strength of the Integrated Circuit Module (ICM) to the card body.',
      },
      {
        category_id: CBY,
        test_id: 'IT-CBY-005',
        test_name: 'Solidity – Resistance to Impact',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description: 'Test overall card resistance to impact forces without structural failure or delamination.',
      },
      {
        category_id: CBY,
        test_id: 'IT-CBY-006',
        test_name: 'Card Edges (IS7810)',
        standard_section: 'IS7810',
        iso_standard: 'ISO 7810',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        is_mandatory: true,
        status: 'active',
        description: 'Inspect card edges for burrs, notches, and imperfections; edge burr shall not exceed the specified limit per ISO 7810.',
      },

      // ── MCH — Mechanical Tests ─────────────────────────────────────────
      {
        category_id: MCH,
        test_id: 'IT-MCH-001',
        test_name: 'Wrapping Test Robustness',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description: 'Evaluate card robustness when subjected to a wrapping/bending stress test cycle.',
      },
      {
        category_id: MCH,
        test_id: 'IT-MCH-002',
        test_name: 'Bending Stiffness',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'N·mm',
        is_mandatory: true,
        status: 'active',
        description: 'Measure the bending stiffness of the card in both longitudinal and transverse directions.',
      },
      {
        category_id: MCH,
        test_id: 'IT-MCH-004',
        test_name: 'Dynamic Torsional Stress',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'inactive',
        description: 'Subject the card to repeated torsional stress cycles and verify no functional or structural failure.',
      },
      {
        category_id: MCH,
        test_id: 'IT-MCH-005',
        test_name: '3 wheel Test Robustness',
        test_frequency: '1/Batch',
        test_type: 'passfail',
        is_mandatory: true,
        status: 'active',
        description: 'Evaluate card mechanical robustness using a 3-wheel roller test to simulate handling wear.',
      },

      // ── ELE — Electrical Tests ─────────────────────────────────────────
      {
        category_id: ELE,
        test_id: 'IT-ELE-001',
        test_name: 'Q-Factor',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        is_mandatory: true,
        status: 'active',
        description: 'Measure the Q-factor of the card antenna coil to verify RF performance and resonance quality.',
      },
      {
        category_id: ELE,
        test_id: 'IT-ELE-002',
        test_name: 'Reading Distance',
        test_frequency: '1/Batch',
        test_type: 'measurement',
        unit_of_measurement: 'mm',
        is_mandatory: true,
        status: 'active',
        description: 'Measure the maximum operating reading distance of the card with a standard contactless reader.',
      },
    ];

    const summary = { PHY: 0, CBY: 0, MCH: 0, ELE: 0 };
    const codeById = { [PHY]: 'PHY', [CBY]: 'CBY', [MCH]: 'MCH', [ELE]: 'ELE' };

    for (const def of definitions) {
      const [record, created] = await TestDefinition.findOrCreate({
        where: { test_id: def.test_id },
        defaults: def,
      });
      const catCode = codeById[def.category_id];
      if (created) {
        summary[catCode]++;
        console.log(`✅ Created [${catCode}]: ${def.test_id} — ${def.test_name}`);
      } else {
        await record.update(def);
        console.log(`🔄 Updated [${catCode}]: ${def.test_id} — ${def.test_name}`);
      }
    }

    console.log('\n✅ Internal Testing seeding complete.');
    console.log(`   PHY: ${summary.PHY} | CBY: ${summary.CBY} | MCH: ${summary.MCH} | ELE: ${summary.ELE}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedInternalTests();
