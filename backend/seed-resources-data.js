const models = require('./models');

async function seedResourcesData() {
  try {
    console.log('🌱 Starting resources data seeding...\n');

    // Find Isaac's Cafe project
    const project = await models.Project.findOne({
      where: { name: "Isaac's Cafe - Restaurant Launch" }
    });

    if (!project) {
      console.error('❌ Isaac\'s Cafe project not found');
      return;
    }

    console.log(`✅ Found project: ${project.name} (ID: ${project.id})\n`);

    // Get existing users
    const users = await models.User.findAll();
    if (users.length < 4) {
      console.error('❌ Not enough users found. Run main seed first.');
      return;
    }

    // ========== TEAM MEMBERS ==========
    console.log('👥 Creating Team Members...');
    const teamMembers = await models.TeamMember.bulkCreate([
      {
        project_id: project.id,
        user_id: users[0].id, // John Smith
        role: 'Project Manager',
        allocation_percentage: 100,
        start_date: '2025-01-15',
        end_date: '2025-06-30',
        hourly_rate: 125.00,
        skills: JSON.stringify(['Project Management', 'Leadership', 'Budgeting', 'Risk Management']),
        status: 'active'
      },
      {
        project_id: project.id,
        user_id: users[1].id, // Sarah Johnson
        role: 'Head Chef',
        allocation_percentage: 100,
        start_date: '2025-02-01',
        end_date: '2025-06-30',
        hourly_rate: 85.00,
        skills: JSON.stringify(['Culinary Arts', 'Menu Development', 'Kitchen Management', 'Food Safety']),
        status: 'active'
      },
      {
        project_id: project.id,
        user_id: users[2].id, // Mike Chen
        role: 'Construction Manager',
        allocation_percentage: 80,
        start_date: '2025-01-20',
        end_date: '2025-04-30',
        hourly_rate: 95.00,
        skills: JSON.stringify(['Construction', 'Project Coordination', 'Safety Management', 'Vendor Relations']),
        status: 'active'
      },
      {
        project_id: project.id,
        user_id: users[3].id, // Emily Davis
        role: 'Marketing Coordinator',
        allocation_percentage: 60,
        start_date: '2025-04-01',
        end_date: '2025-06-30',
        hourly_rate: 65.00,
        skills: JSON.stringify(['Marketing', 'Social Media', 'Event Planning', 'Graphic Design']),
        status: 'active'
      }
    ]);
    console.log(`✅ Created ${teamMembers.length} team members\n`);

    // Get some tasks for allocations (if they exist)
    const tasks = await models.Task.findAll({
      where: { project_id: project.id },
      limit: 5
    });

    // ========== RESOURCE ALLOCATIONS ==========
    console.log('📊 Creating Resource Allocations...');
    const allocations = [];
    
    // Project Manager allocations
    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[0].id,
      task_id: tasks[0]?.id || null,
      allocated_hours: 160,
      start_date: '2025-01-15',
      end_date: '2025-02-15',
      notes: 'Project initiation and planning phase'
    });

    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[0].id,
      task_id: tasks[1]?.id || null,
      allocated_hours: 200,
      start_date: '2025-02-16',
      end_date: '2025-04-30',
      notes: 'Construction oversight and vendor management'
    });

    // Head Chef allocations
    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[1].id,
      task_id: tasks[2]?.id || null,
      allocated_hours: 120,
      start_date: '2025-02-01',
      end_date: '2025-03-31',
      notes: 'Menu development and kitchen design consultation'
    });

    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[1].id,
      task_id: tasks[3]?.id || null,
      allocated_hours: 180,
      start_date: '2025-04-01',
      end_date: '2025-06-30',
      notes: 'Staff training and kitchen setup'
    });

    // Construction Manager allocations
    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[2].id,
      task_id: tasks[1]?.id || null,
      allocated_hours: 320,
      start_date: '2025-01-20',
      end_date: '2025-04-30',
      notes: 'Full renovation project management'
    });

    // Marketing Coordinator allocations
    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[3].id,
      task_id: tasks[4]?.id || null,
      allocated_hours: 80,
      start_date: '2025-04-01',
      end_date: '2025-05-31',
      notes: 'Pre-launch marketing campaign'
    });

    allocations.push({
      project_id: project.id,
      team_member_id: teamMembers[3].id,
      task_id: null,
      allocated_hours: 60,
      start_date: '2025-06-01',
      end_date: '2025-06-30',
      notes: 'Grand opening event coordination'
    });

    const createdAllocations = await models.ResourceAllocation.bulkCreate(allocations);
    console.log(`✅ Created ${createdAllocations.length} resource allocations\n`);

    console.log('✅ Resources data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${teamMembers.length} Team Members`);
    console.log(`   - ${createdAllocations.length} Resource Allocations`);
    console.log(`   - Total allocated hours: ${allocations.reduce((sum, a) => sum + parseFloat(a.allocated_hours), 0)}`);

  } catch (error) {
    console.error('❌ Error seeding resources data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedResourcesData()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = seedResourcesData;
