const bcrypt = require('bcryptjs');
require('dotenv').config();
const { sequelize } = require('./config/database');
const models = require('./models');

async function seedData() {
  try {
    console.log('🌱 Starting data seeding...\n');
    
    await sequelize.sync({ force: true });
    console.log('✅ Database synced\n');

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create users
    const users = await models.User.bulkCreate([
      { name: 'John Smith', email: 'john@isaacscafe.com', password_hash: hashedPassword, role: 'project_manager' },
      { name: 'Sarah Johnson', email: 'sarah@isaacscafe.com', password_hash: hashedPassword, role: 'team_member' },
      { name: 'Mike Chen', email: 'mike@isaacscafe.com', password_hash: hashedPassword, role: 'team_member' },
      { name: 'Emily Davis', email: 'emily@isaacscafe.com', password_hash: hashedPassword, role: 'team_member' },
      { name: 'Admin User', email: 'admin@cqm.com', password_hash: await bcrypt.hash('admin123', 10), role: 'admin' }
    ]);
    console.log('✅ Users created');

    // PROJECT 1: Isaac's Cafe
    const project1 = await models.Project.create({
      name: "Isaac's Cafe - Restaurant Launch",
      description: 'Complete restaurant launch including renovation, equipment, staff hiring, and grand opening.',
      start_date: '2025-01-15',
      end_date: '2025-06-30',
      budget: 250000,
      status: 'in_progress',
      progress: 45,
      project_manager_id: users[0].id
    });
    console.log('✅ Project 1: Isaac\'s Cafe created');

    // Charter
    await models.ProjectCharter.create({
      project_id: project1.id,
      business_case: 'Modern health-conscious dining experience with organic, locally-sourced menu.',
      objectives: '1. Launch by June 2025\n2. 100 daily customers first month\n3. 4.5+ star rating\n4. Break even in 6 months',
      success_criteria: 'Pass health inspection, achieve customer targets, maintain quality, stay in budget',
      assumptions: 'Permits approved on time, contractors available, stable supply chain',
      constraints: '$250,000 budget, summer opening deadline, limited kitchen space',
      approved: true,
      approved_by: users[0].id,
      approved_date: '2025-01-10'
    });

    // Stakeholders
    await models.Stakeholder.bulkCreate([
      { project_id: project1.id, name: 'Isaac Rodriguez', role: 'Owner', email: 'isaac@isaacscafe.com', interest_level: 'high', influence_level: 'high' },
      { project_id: project1.id, name: 'City Health Dept', role: 'Regulatory', interest_level: 'medium', influence_level: 'high' },
      { project_id: project1.id, name: 'Main Street Bank', role: 'Financial Backer', interest_level: 'high', influence_level: 'high' }
    ]);

    // Change Requests
    await models.ChangeRequest.bulkCreate([
      { project_id: project1.id, title: 'Add Outdoor Patio', description: '20-seat patio addition', justification: 'Increase capacity 33%', impact_analysis: 'Cost: +$15k, Timeline: +2 weeks', priority: 'medium', status: 'approved', requested_by: users[0].id },
      { project_id: project1.id, title: 'Upgrade Espresso Machine', description: 'Professional espresso machine', justification: 'Quality coffee expectations', impact_analysis: 'Cost: +$8k', priority: 'high', status: 'implemented', requested_by: users[1].id }
    ]);

    // Lessons Learned
    await models.LessonLearned.bulkCreate([
      { project_id: project1.id, title: 'Permit Process Delays', description: 'Took 6 weeks vs 3 weeks', category: 'process', phase: 'planning', what_worked: 'Complete documentation', what_didnt_work: 'Timeline underestimated', recommendations: 'Add 100% buffer to permits', documented_by: users[0].id },
      { project_id: project1.id, title: 'Local Supplier Relationships', description: 'Early partnerships paid off', category: 'relationship', phase: 'execution', what_worked: 'Early engagement', recommendations: 'Start 3+ months early', documented_by: users[1].id }
    ]);

    // Tasks
    await models.Task.bulkCreate([
      { project_id: project1.id, name: 'Obtain Business License', start_date: '2025-01-15', end_date: '2025-02-15', duration: 30, progress: 100, status: 'completed', priority: 'high', assigned_to: users[0].id },
      { project_id: project1.id, name: 'Interior Renovation', start_date: '2025-02-01', end_date: '2025-04-15', duration: 73, progress: 85, status: 'in_progress', priority: 'high', assigned_to: users[2].id },
      { project_id: project1.id, name: 'Install Kitchen Equipment', start_date: '2025-03-15', end_date: '2025-04-30', duration: 45, progress: 60, status: 'in_progress', priority: 'critical', assigned_to: users[2].id },
      { project_id: project1.id, name: 'Hire and Train Staff', start_date: '2025-04-01', end_date: '2025-06-01', duration: 60, progress: 30, status: 'in_progress', priority: 'high', assigned_to: users[1].id },
      { project_id: project1.id, name: 'Develop Menu', start_date: '2025-03-01', end_date: '2025-05-15', duration: 75, progress: 70, status: 'in_progress', priority: 'high', assigned_to: users[3].id },
      { project_id: project1.id, name: 'Grand Opening', start_date: '2025-06-30', end_date: '2025-06-30', duration: 1, progress: 0, status: 'not_started', priority: 'critical', assigned_to: users[0].id, is_milestone: true }
    ]);

    // Milestones
    await models.Milestone.bulkCreate([
      { project_id: project1.id, name: 'All Permits Approved', due_date: '2025-02-28', status: 'completed', completion_date: '2025-02-25' },
      { project_id: project1.id, name: 'Renovation Complete', due_date: '2025-04-15', status: 'in_progress' },
      { project_id: project1.id, name: 'Kitchen Operational', due_date: '2025-05-01', status: 'pending' }
    ]);

    // Budgets
    await models.Budget.bulkCreate([
      { project_id: project1.id, category: 'Renovation', planned_amount: 80000, approved_amount: 80000 },
      { project_id: project1.id, category: 'Kitchen Equipment', planned_amount: 90000, approved_amount: 90000 },
      { project_id: project1.id, category: 'Marketing', planned_amount: 20000, approved_amount: 20000 }
    ]);

    // Expenses
    await models.Expense.bulkCreate([
      { project_id: project1.id, budget_id: 1, description: 'Flooring installation', amount: 12000, expense_date: '2025-02-15', category: 'materials', status: 'approved', approved_by: users[0].id },
      { project_id: project1.id, budget_id: 2, description: 'Commercial refrigeration', amount: 25000, expense_date: '2025-03-20', category: 'equipment', status: 'approved', approved_by: users[0].id },
      { project_id: project1.id, budget_id: 3, description: 'Social media campaign', amount: 5000, expense_date: '2025-05-05', category: 'marketing', status: 'pending' }
    ]);

    // EVM
    await models.EVMSnapshot.bulkCreate([
      { project_id: project1.id, snapshot_date: '2025-03-31', planned_value: 100000, earned_value: 95000, actual_cost: 98000, cpi: 0.97, spi: 0.95, eac: 257732, vac: -7732, tcpi: 1.05 },
      { project_id: project1.id, snapshot_date: '2025-04-30', planned_value: 150000, earned_value: 145000, actual_cost: 148000, cpi: 0.98, spi: 0.97, eac: 255102, vac: -5102, tcpi: 1.03 }
    ]);

    // Quality Metrics
    await models.QualityMetric.bulkCreate([
      { project_id: project1.id, metric_name: 'Food Safety Score', metric_type: 'reliability', target_value: 95, actual_value: 98, unit: '%', measurement_date: '2025-04-15', status: 'on-target', created_by: users[0].id },
      { project_id: project1.id, metric_name: 'Construction Quality', metric_type: 'performance', target_value: 90, actual_value: 88, unit: '%', measurement_date: '2025-04-10', status: 'at-risk', created_by: users[2].id }
    ]);

    // Inspections
    const inspection = await models.QualityInspection.create({
      project_id: project1.id,
      inspection_name: 'Kitchen Health Inspection',
      inspection_type: 'audit',
      inspection_date: '2025-04-15',
      inspector_id: users[0].id,
      status: 'completed',
      result: 'pass',
      score: 98,
      findings: 'Excellent food safety practices'
    });

    // Defects
    await models.Defect.bulkCreate([
      { project_id: project1.id, inspection_id: inspection.id, title: 'Electrical Outlet Non-Compliant', description: 'Two outlets not meeting code', severity: 'medium', priority: 'high', status: 'resolved', detected_date: '2025-04-10', detected_by: users[2].id, resolved_date: '2025-04-18', resolution: 'Added two outlets' },
      { project_id: project1.id, title: 'Kitchen Tile Grout Cracking', description: 'Minor cracks in grout', severity: 'low', priority: 'low', status: 'open', detected_date: '2025-04-12', detected_by: users[3].id }
    ]);

    // Risks
    await models.Risk.bulkCreate([
      { project_id: project1.id, title: 'Equipment Delivery Delays', description: 'Specialized equipment on backorder', category: 'external', probability: 'medium', impact: 'high', status: 'mitigated', owner_id: users[2].id, response_strategy: 'mitigate', response_plan: 'Alternative suppliers identified', identified_date: '2025-03-01' },
      { project_id: project1.id, title: 'Staff Recruitment Challenges', description: 'Difficulty finding experienced staff', category: 'organizational', probability: 'high', impact: 'medium', status: 'monitoring', owner_id: users[1].id, response_strategy: 'mitigate', identified_date: '2025-03-15' },
      { project_id: project1.id, title: 'Competitor Opening Nearby', description: 'New restaurant 2 blocks away', category: 'external', probability: 'medium', impact: 'medium', status: 'identified', owner_id: users[0].id, response_strategy: 'mitigate', identified_date: '2025-04-20' }
    ]);

    console.log('✅ All Isaac\'s Cafe data created\n');

    // PROJECT 2: TechVenture
    const project2 = await models.Project.create({
      name: 'TechVenture - Mobile App Development',
      description: 'Mobile task management app for small businesses.',
      start_date: '2025-02-01',
      end_date: '2025-08-31',
      budget: 180000,
      status: 'in_progress',
      progress: 35,
      project_manager_id: users[1].id
    });
    console.log('✅ Project 2: TechVenture created');

    await models.ProjectCharter.create({
      project_id: project2.id,
      business_case: 'Affordable task management for small businesses.',
      objectives: '1. Launch iOS/Android by August\n2. 1,000 beta users\n3. 4+ star rating',
      success_criteria: 'Apps approved, positive feedback, metrics met',
      approved: true,
      approved_by: users[1].id
    });

    await models.Stakeholder.bulkCreate([
      { project_id: project2.id, name: 'Jennifer Martinez', role: 'CEO', email: 'jennifer@techventure.io', interest_level: 'high', influence_level: 'high' },
      { project_id: project2.id, name: 'VC Partners', role: 'Investors', interest_level: 'high', influence_level: 'high' }
    ]);

    await models.Task.bulkCreate([
      { project_id: project2.id, name: 'Requirements Gathering', start_date: '2025-02-01', end_date: '2025-02-28', duration: 27, progress: 100, status: 'completed', priority: 'critical', assigned_to: users[1].id },
      { project_id: project2.id, name: 'UI/UX Design', start_date: '2025-03-01', end_date: '2025-04-15', duration: 45, progress: 90, status: 'in_progress', priority: 'high', assigned_to: users[3].id },
      { project_id: project2.id, name: 'Backend API Development', start_date: '2025-03-15', end_date: '2025-06-01', duration: 78, progress: 60, status: 'in_progress', priority: 'critical', assigned_to: users[2].id }
    ]);

    await models.Budget.bulkCreate([
      { project_id: project2.id, category: 'Development', planned_amount: 120000, approved_amount: 120000 },
      { project_id: project2.id, category: 'Infrastructure', planned_amount: 30000, approved_amount: 30000 }
    ]);

    await models.Risk.bulkCreate([
      { project_id: project2.id, title: 'API Integration Complexity', description: 'Third-party APIs more complex than expected', category: 'technical', probability: 'high', impact: 'high', status: 'identified', owner_id: users[2].id, response_strategy: 'mitigate', identified_date: '2025-03-20' },
      { project_id: project2.id, title: 'App Store Approval Delays', description: 'Potential rejection or delays', category: 'external', probability: 'medium', impact: 'high', status: 'identified', owner_id: users[1].id, response_strategy: 'mitigate', identified_date: '2025-04-01' }
    ]);

    console.log('✅ All TechVenture data created\n');
    console.log('🎉 Seeding complete!\n');
    console.log('📊 Summary:');
    console.log('   - 2 Projects created');
    console.log('   - 5 Users created');
    console.log('   - All PMBOK features populated');
    console.log('\n✅ You can now login with:');
    console.log('   Email: admin@pmbok.com');
    console.log('   Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedData();
