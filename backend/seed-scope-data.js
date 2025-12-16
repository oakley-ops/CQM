const models = require('./models');

async function seedScopeData() {
  try {
    console.log('🌱 Starting scope data seeding...\n');

    // Find Isaac's Cafe project
    const project = await models.Project.findOne({
      where: { name: "Isaac's Cafe - Restaurant Launch" }
    });

    if (!project) {
      console.error('❌ Isaac\'s Cafe project not found');
      return;
    }

    console.log(`✅ Found project: ${project.name} (ID: ${project.id})\n`);

    // ========== REQUIREMENTS ==========
    console.log('📋 Creating Requirements...');
    const requirements = await models.Requirement.bulkCreate([
      {
        project_id: project.id,
        requirement_id: 'REQ-001',
        title: 'Commercial Kitchen Equipment',
        description: 'Install professional-grade kitchen equipment including stoves, ovens, refrigerators, and prep stations',
        category: 'functional',
        priority: 'critical',
        status: 'approved',
        source: 'Owner Requirements',
        acceptance_criteria: 'All equipment installed, tested, and certified by health inspector'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-002',
        title: 'Seating Capacity',
        description: 'Dining area must accommodate minimum 60 guests with comfortable spacing',
        category: 'functional',
        priority: 'high',
        status: 'approved',
        source: 'Business Plan',
        acceptance_criteria: '60+ seats with ADA compliance and fire code adherence'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-003',
        title: 'Point of Sale System',
        description: 'Modern POS system with inventory tracking, payment processing, and reporting',
        category: 'technical',
        priority: 'high',
        status: 'approved',
        source: 'Operations Manager',
        acceptance_criteria: 'POS system operational with staff training completed'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-004',
        title: 'Health Department Certification',
        description: 'Obtain all required health and safety certifications',
        category: 'regulatory',
        priority: 'critical',
        status: 'approved',
        source: 'City Regulations',
        acceptance_criteria: 'Health permit issued and displayed'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-005',
        title: 'Staff Hiring and Training',
        description: 'Hire and train 15 staff members including chefs, servers, and support staff',
        category: 'business',
        priority: 'high',
        status: 'implemented',
        source: 'HR Requirements',
        acceptance_criteria: 'All positions filled with completed training program'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-006',
        title: 'Interior Design and Ambiance',
        description: 'Create welcoming atmosphere with modern decor, lighting, and music system',
        category: 'functional',
        priority: 'medium',
        status: 'implemented',
        source: 'Owner Vision',
        acceptance_criteria: 'Design approved by owner and completed installation'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-007',
        title: 'Menu Development',
        description: 'Develop signature menu with 30+ items including vegetarian and gluten-free options',
        category: 'business',
        priority: 'high',
        status: 'verified',
        source: 'Head Chef',
        acceptance_criteria: 'Menu finalized, tested, and priced'
      },
      {
        project_id: project.id,
        requirement_id: 'REQ-008',
        title: 'Parking and Accessibility',
        description: 'Ensure adequate parking and ADA-compliant access',
        category: 'regulatory',
        priority: 'high',
        status: 'approved',
        source: 'Building Code',
        acceptance_criteria: '20+ parking spaces with handicap access'
      }
    ]);
    console.log(`✅ Created ${requirements.length} requirements\n`);

    // ========== WBS ITEMS ==========
    console.log('🗂️  Creating WBS Items...');
    const wbsItems = await models.WBSItem.bulkCreate([
      {
        project_id: project.id,
        wbs_code: '1.0',
        name: 'Project Initiation',
        description: 'Initial planning and setup phase',
        parent_id: null,
        level: 1,
        estimated_hours: 160,
        actual_hours: 160,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '2.0',
        name: 'Renovation and Construction',
        description: 'Physical space renovation',
        parent_id: null,
        level: 1,
        estimated_hours: 800,
        actual_hours: 720,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '2.1',
        name: 'Kitchen Renovation',
        description: 'Commercial kitchen build-out',
        parent_id: null, // Will be updated after getting parent ID
        level: 2,
        estimated_hours: 400,
        actual_hours: 380,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '2.2',
        name: 'Dining Area Setup',
        description: 'Dining room renovation and furnishing',
        parent_id: null,
        level: 2,
        estimated_hours: 300,
        actual_hours: 280,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '2.3',
        name: 'Restroom Upgrades',
        description: 'ADA-compliant restroom renovation',
        parent_id: null,
        level: 2,
        estimated_hours: 100,
        actual_hours: 60,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '3.0',
        name: 'Equipment and Technology',
        description: 'Purchase and install equipment',
        parent_id: null,
        level: 1,
        estimated_hours: 240,
        actual_hours: 200,
        status: 'in-progress'
      },
      {
        project_id: project.id,
        wbs_code: '3.1',
        name: 'Kitchen Equipment',
        description: 'Commercial kitchen equipment procurement',
        parent_id: null,
        level: 2,
        estimated_hours: 120,
        actual_hours: 100,
        status: 'in-progress'
      },
      {
        project_id: project.id,
        wbs_code: '3.2',
        name: 'POS System',
        description: 'Point of sale system installation',
        parent_id: null,
        level: 2,
        estimated_hours: 80,
        actual_hours: 70,
        status: 'in-progress'
      },
      {
        project_id: project.id,
        wbs_code: '3.3',
        name: 'Audio/Visual Systems',
        description: 'Music and display systems',
        parent_id: null,
        level: 2,
        estimated_hours: 40,
        actual_hours: 30,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '4.0',
        name: 'Staffing and Training',
        description: 'Recruit and train staff',
        parent_id: null,
        level: 1,
        estimated_hours: 320,
        actual_hours: 280,
        status: 'in-progress'
      },
      {
        project_id: project.id,
        wbs_code: '4.1',
        name: 'Recruitment',
        description: 'Hire all staff positions',
        parent_id: null,
        level: 2,
        estimated_hours: 120,
        actual_hours: 100,
        status: 'completed'
      },
      {
        project_id: project.id,
        wbs_code: '4.2',
        name: 'Training Program',
        description: 'Comprehensive staff training',
        parent_id: null,
        level: 2,
        estimated_hours: 200,
        actual_hours: 180,
        status: 'in-progress'
      },
      {
        project_id: project.id,
        wbs_code: '5.0',
        name: 'Grand Opening',
        description: 'Launch event and marketing',
        parent_id: null,
        level: 1,
        estimated_hours: 160,
        actual_hours: 0,
        status: 'not-started'
      }
    ]);
    console.log(`✅ Created ${wbsItems.length} WBS items\n`);

    // ========== VENDORS ==========
    console.log('🏢 Creating Vendors...');
    const vendors = await models.Vendor.bulkCreate([
      {
        name: 'Restaurant Supply Co.',
        contact_person: 'Mike Thompson',
        email: 'mike@restaurantsupply.com',
        phone: '555-0101',
        address: '123 Industrial Blvd, City, ST 12345',
        category: 'Equipment',
        rating: 4.5,
        notes: 'Primary kitchen equipment supplier'
      },
      {
        name: 'Fresh Foods Distributors',
        contact_person: 'Sarah Martinez',
        email: 'sarah@freshfoods.com',
        phone: '555-0102',
        address: '456 Market St, City, ST 12345',
        category: 'Food Supplier',
        rating: 4.8,
        notes: 'Daily produce and meat delivery'
      },
      {
        name: 'TechPOS Systems',
        contact_person: 'David Lee',
        email: 'david@techpos.com',
        phone: '555-0103',
        address: '789 Tech Park, City, ST 12345',
        category: 'Technology',
        rating: 4.3,
        notes: 'POS system and support'
      },
      {
        name: 'Elite Construction Group',
        contact_person: 'Robert Johnson',
        email: 'robert@eliteconstruction.com',
        phone: '555-0104',
        address: '321 Builder Ave, City, ST 12345',
        category: 'Construction',
        rating: 4.7,
        notes: 'General contractor for renovation'
      },
      {
        name: 'Modern Furniture Solutions',
        contact_person: 'Lisa Chen',
        email: 'lisa@modernfurniture.com',
        phone: '555-0105',
        address: '654 Design Way, City, ST 12345',
        category: 'Furniture',
        rating: 4.6,
        notes: 'Dining room furniture and fixtures'
      }
    ]);
    console.log(`✅ Created ${vendors.length} vendors\n`);

    // ========== CONTRACTS ==========
    console.log('📄 Creating Contracts...');
    const contracts = await models.Contract.bulkCreate([
      {
        project_id: project.id,
        vendor_id: vendors[0].id,
        contract_number: 'CNT-2025-001',
        title: 'Kitchen Equipment Supply Agreement',
        description: 'Supply and installation of commercial kitchen equipment',
        contract_type: 'fixed-price',
        start_date: '2025-02-01',
        end_date: '2025-03-31',
        contract_value: 85000.00,
        status: 'active',
        terms: 'Net 30 payment terms, 1-year warranty on all equipment',
        deliverables: 'Complete kitchen equipment package including installation and training'
      },
      {
        project_id: project.id,
        vendor_id: vendors[1].id,
        contract_number: 'CNT-2025-002',
        title: 'Food Supply Agreement',
        description: 'Daily food and beverage supply contract',
        contract_type: 'time-and-materials',
        start_date: '2025-06-01',
        end_date: '2026-05-31',
        contract_value: 180000.00,
        status: 'pending',
        terms: 'Weekly invoicing, 2-day payment terms, minimum order requirements',
        deliverables: 'Daily delivery of fresh produce, meats, dairy, and dry goods'
      },
      {
        project_id: project.id,
        vendor_id: vendors[2].id,
        contract_number: 'CNT-2025-003',
        title: 'POS System License and Support',
        description: 'Point of sale software and hardware with ongoing support',
        contract_type: 'fixed-price',
        start_date: '2025-04-01',
        end_date: '2026-03-31',
        contract_value: 12000.00,
        status: 'active',
        terms: 'Annual license with monthly support fee, 24/7 technical support',
        deliverables: 'POS hardware, software installation, staff training, ongoing support'
      },
      {
        project_id: project.id,
        vendor_id: vendors[3].id,
        contract_number: 'CNT-2025-004',
        title: 'Renovation Construction Contract',
        description: 'Complete restaurant renovation including kitchen, dining, and restrooms',
        contract_type: 'fixed-price',
        start_date: '2025-01-20',
        end_date: '2025-04-30',
        contract_value: 175000.00,
        status: 'completed',
        terms: 'Progress payments based on milestones, 90-day warranty',
        deliverables: 'Fully renovated restaurant space meeting all building codes'
      },
      {
        project_id: project.id,
        vendor_id: vendors[4].id,
        contract_number: 'CNT-2025-005',
        title: 'Furniture and Fixtures Supply',
        description: 'Dining room furniture, bar stools, and decorative fixtures',
        contract_type: 'fixed-price',
        start_date: '2025-04-15',
        end_date: '2025-05-15',
        contract_value: 35000.00,
        status: 'active',
        terms: '50% deposit, balance on delivery, 6-month warranty',
        deliverables: 'Tables, chairs, bar stools, lighting fixtures, and decor items'
      }
    ]);
    console.log(`✅ Created ${contracts.length} contracts\n`);

    console.log('✅ Scope data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${requirements.length} Requirements`);
    console.log(`   - ${wbsItems.length} WBS Items`);
    console.log(`   - ${vendors.length} Vendors`);
    console.log(`   - ${contracts.length} Contracts`);

  } catch (error) {
    console.error('❌ Error seeding scope data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedScopeData()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = seedScopeData;
