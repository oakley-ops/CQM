const { ISOStandard } = require('../models');

/**
 * Seed ISO Standards Data
 * Creates reference data for all ISO and ANSI standards used in CQM testing
 */

const isoStandards = [
  {
    standard_code: 'ISO7810',
    standard_name: 'Identification cards - Physical characteristics',
    version: '2019',
    publication_year: 2019,
    description: 'Specifies physical characteristics for identification cards including ID-1, ID-2, and ID-3 card types',
    scope: 'Covers dimensions, warpage, construction, bending stiffness, toxicity, and resistance to chemicals',
    status: 'Active',
    effective_date: '2019-12-01',
    issuing_organization: 'ISO',
    categories: ['Card Dimensions', 'Physical Properties', 'Material Requirements'],
    notes: 'Fundamental standard for all card-based applications'
  },
  {
    standard_code: 'ISO7816-1',
    standard_name: 'Identification cards - Integrated circuit cards - Part 1: Cards with contacts - Physical characteristics',
    version: '2011',
    publication_year: 2011,
    description: 'Defines physical characteristics of integrated circuit cards with contacts',
    scope: 'Covers contact position, dimensions, mechanical stress, and environmental requirements',
    status: 'Active',
    effective_date: '2011-07-01',
    issuing_organization: 'ISO',
    categories: ['IC Cards', 'Contact Cards', 'Physical Properties'],
    notes: 'Essential for EMV and contact smart cards'
  },
  {
    standard_code: 'ISO7811-2',
    standard_name: 'Identification cards - Recording technique - Part 2: Magnetic stripe - Low coercivity',
    version: '2018',
    publication_year: 2018,
    description: 'Specifies characteristics and recording technique for low coercivity magnetic stripes',
    scope: 'Magnetic stripe location, encoding, and read/write characteristics for low coercivity (LoCo)',
    status: 'Active',
    effective_date: '2018-06-01',
    issuing_organization: 'ISO',
    categories: ['Magnetic Stripe', 'Low Coercivity'],
    notes: 'Used for access cards, hotel keys, and some payment cards'
  },
  {
    standard_code: 'ISO7811-6',
    standard_name: 'Identification cards - Recording technique - Part 6: Magnetic stripe - High coercivity',
    version: '2018',
    publication_year: 2018,
    description: 'Specifies characteristics and recording technique for high coercivity magnetic stripes',
    scope: 'Magnetic stripe location, encoding, and read/write characteristics for high coercivity (HiCo)',
    status: 'Active',
    effective_date: '2018-06-01',
    issuing_organization: 'ISO',
    categories: ['Magnetic Stripe', 'High Coercivity'],
    notes: 'Standard for most payment cards (credit/debit)'
  },
  {
    standard_code: 'ISO10373-1',
    standard_name: 'Identification cards - Test methods - Part 1: General characteristics',
    version: '2020',
    publication_year: 2020,
    description: 'Defines test methods for general physical characteristics of identification cards',
    scope: 'Test procedures for dimensions, warpage, bending, resistance to chemicals, etc.',
    status: 'Active',
    effective_date: '2020-03-01',
    issuing_organization: 'ISO',
    categories: ['Test Methods', 'Physical Testing'],
    notes: 'Companion testing standard to ISO7810'
  },
  {
    standard_code: 'ISO10373-2',
    standard_name: 'Identification cards - Test methods - Part 2: Cards with magnetic stripes',
    version: '2020',
    publication_year: 2020,
    description: 'Defines test methods specific to magnetic stripe cards',
    scope: 'Testing magnetic characteristics, stripe adhesion, wear resistance',
    status: 'Active',
    effective_date: '2020-03-01',
    issuing_organization: 'ISO',
    categories: ['Test Methods', 'Magnetic Stripe Testing'],
    notes: 'Companion testing standard to ISO7811'
  },
  {
    standard_code: 'ANSI NCITS 322',
    standard_name: 'American National Standard for Financial Services - Test Methods for Plastic Cards',
    version: '1998',
    publication_year: 1998,
    description: 'US standard for testing plastic payment cards',
    scope: 'Impact resistance, corner impact, surface abrasion, embossing durability',
    status: 'Active',
    effective_date: '1998-01-01',
    issuing_organization: 'ANSI',
    categories: ['Test Methods', 'Financial Cards', 'Durability Testing'],
    notes: 'Widely used in US payment card industry'
  },
  {
    standard_code: 'EMV',
    standard_name: 'EMV Integrated Circuit Card Specifications for Payment Systems',
    version: '4.3',
    publication_year: 2011,
    description: 'Global standard for chip-based payment cards',
    scope: 'Physical, electrical, and data specifications for IC payment cards',
    status: 'Active',
    effective_date: '2011-11-01',
    issuing_organization: 'EMVCo',
    categories: ['Payment Systems', 'IC Cards', 'Security'],
    notes: 'Industry standard for secure chip card payments'
  },
  {
    standard_code: 'ISO14443',
    standard_name: 'Identification cards - Contactless integrated circuit cards - Proximity cards',
    version: '2018',
    publication_year: 2018,
    description: 'Standard for proximity contactless smart cards',
    scope: 'Physical characteristics, RF interface, and protocol for contactless cards',
    status: 'Active',
    effective_date: '2018-01-01',
    issuing_organization: 'ISO',
    categories: ['Contactless Cards', 'RFID', 'Proximity Cards'],
    notes: 'Used in contactless payment, access control, and transport'
  },
  {
    standard_code: 'ISO15693',
    standard_name: 'Identification cards - Contactless integrated circuit cards - Vicinity cards',
    version: '2010',
    publication_year: 2010,
    description: 'Standard for vicinity contactless smart cards',
    scope: 'Physical characteristics and air interface for longer-range contactless cards',
    status: 'Active',
    effective_date: '2010-01-01',
    issuing_organization: 'ISO',
    categories: ['Contactless Cards', 'RFID', 'Vicinity Cards'],
    notes: 'Used in library systems, asset tracking'
  },
  {
    standard_code: 'PC/SC',
    standard_name: 'Personal Computer/Smart Card Specification',
    version: '2.02',
    publication_year: 2010,
    description: 'Interface standard for smart card readers and cards',
    scope: 'API and protocols for PC-based smart card applications',
    status: 'Active',
    effective_date: '2010-01-01',
    issuing_organization: 'PC/SC Workgroup',
    categories: ['Software Interface', 'Smart Card Readers'],
    notes: 'Widely used in Windows and Linux systems'
  }
];

async function seedISOStandards() {
  try {
    console.log('🔍 Checking existing ISO standards...');
    
    for (const standardData of isoStandards) {
      const [standard, created] = await ISOStandard.findOrCreate({
        where: { standard_code: standardData.standard_code },
        defaults: standardData
      });
      
      if (created) {
        console.log(`✅ Created standard: ${standardData.standard_code} - ${standardData.standard_name}`);
      } else {
        console.log(`ℹ️  Standard already exists: ${standardData.standard_code}`);
      }
    }
    
    console.log(`\n✅ ISO Standards seed complete! ${isoStandards.length} standards processed.`);
  } catch (error) {
    console.error('❌ Error seeding ISO standards:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const { sequelize } = require('../config/database');
  
  seedISOStandards()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedISOStandards;
