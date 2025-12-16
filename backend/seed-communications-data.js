const models = require('./models');

async function seedCommunicationsData() {
  try {
    console.log('🌱 Starting communications data seeding...\n');

    // Find Isaac's Cafe project
    const project = await models.Project.findOne({
      where: { name: "Isaac's Cafe - Restaurant Launch" }
    });

    if (!project) {
      console.error('❌ Isaac\'s Cafe project not found');
      return;
    }

    console.log(`✅ Found project: ${project.name} (ID: ${project.id})\n`);

    // Get a user for created_by
    const user = await models.User.findOne();
    if (!user) {
      console.error('❌ No users found');
      return;
    }

    // ========== STATUS REPORTS ==========
    console.log('📊 Creating Status Reports...');
    const statusReports = await models.StatusReport.bulkCreate([
      {
        project_id: project.id,
        report_date: '2025-01-31',
        reporting_period: 'January 2025',
        overall_status: 'on-track',
        accomplishments: '- Project kickoff completed\n- Initial site assessment done\n- Vendor contracts signed',
        planned_activities: '- Begin renovation work\n- Order kitchen equipment\n- Finalize menu design',
        issues: 'Minor delay in permit approval',
        risks: 'Weather may impact construction timeline',
        created_by: user.id
      },
      {
        project_id: project.id,
        report_date: '2025-02-28',
        reporting_period: 'February 2025',
        overall_status: 'on-track',
        accomplishments: '- Demolition completed\n- Electrical work in progress\n- Kitchen equipment ordered',
        planned_activities: '- Complete electrical and plumbing\n- Install kitchen equipment\n- Begin interior design',
        issues: 'None',
        risks: 'Supply chain delays for equipment',
        created_by: user.id
      },
      {
        project_id: project.id,
        report_date: '2025-03-31',
        reporting_period: 'March 2025',
        overall_status: 'at-risk',
        accomplishments: '- Plumbing completed\n- Kitchen equipment delivered\n- Dining area framing done',
        planned_activities: '- Install kitchen equipment\n- Complete dining area construction\n- Start staff recruitment',
        issues: 'Equipment installation delayed by 1 week',
        risks: 'May impact overall timeline',
        created_by: user.id
      }
    ]);
    console.log(`✅ Created ${statusReports.length} status reports\n`);

    // ========== MEETING MINUTES ==========
    console.log('📝 Creating Meeting Minutes...');
    const meetingMinutes = await models.MeetingMinute.bulkCreate([
      {
        project_id: project.id,
        meeting_date: '2025-01-15',
        meeting_type: 'kickoff',
        meeting_title: 'Project Kickoff Meeting',
        attendees: 'John Smith, Sarah Johnson, Mike Chen, Emily Davis',
        agenda: '1. Project overview\n2. Roles and responsibilities\n3. Timeline review\n4. Budget discussion',
        discussion: 'Team introduced, project scope reviewed, timeline confirmed. All stakeholders aligned on deliverables.',
        decisions: '- Approved project charter\n- Confirmed January 15 start date\n- Agreed on weekly status meetings',
        action_items: '- John: Set up project tracking system\n- Mike: Schedule site inspection\n- Sarah: Begin menu development',
        next_meeting: '2025-01-22',
        created_by: user.id
      },
      {
        project_id: project.id,
        meeting_date: '2025-02-05',
        meeting_type: 'status',
        meeting_title: 'Construction Progress Review',
        attendees: 'John Smith, Mike Chen, Construction Team',
        agenda: '1. Demolition status\n2. Electrical work timeline\n3. Material delivery schedule',
        discussion: 'Demolition ahead of schedule. Electrical contractor confirmed 2-week timeline. All materials on track for delivery.',
        decisions: '- Approved change order for additional outlets\n- Confirmed plumbing contractor start date',
        action_items: '- Mike: Coordinate electrical inspection\n- John: Update project schedule',
        next_meeting: '2025-02-12',
        created_by: user.id
      },
      {
        project_id: project.id,
        meeting_date: '2025-03-10',
        meeting_type: 'planning',
        meeting_title: 'Staff Training Planning',
        attendees: 'John Smith, Sarah Johnson, Emily Davis',
        agenda: '1. Training program design\n2. Hiring timeline\n3. Onboarding process',
        discussion: 'Discussed comprehensive training program for kitchen and service staff. Reviewed hiring timeline to ensure staff ready for opening.',
        decisions: '- Start hiring in April\n- 2-week training program before opening\n- Emily to lead onboarding',
        action_items: '- Sarah: Develop training materials\n- Emily: Create job postings\n- John: Budget approval for training',
        next_meeting: '2025-03-24',
        created_by: user.id
      },
      {
        project_id: project.id,
        meeting_date: '2025-04-01',
        meeting_type: 'review',
        meeting_title: 'Equipment Installation Review',
        attendees: 'John Smith, Sarah Johnson, Mike Chen',
        agenda: '1. Equipment installation status\n2. Kitchen layout verification\n3. Safety compliance',
        discussion: 'Reviewed equipment installation progress. Kitchen layout meets all requirements. Safety inspection scheduled.',
        decisions: '- Approved kitchen layout\n- Scheduled final inspection for April 15',
        action_items: '- Mike: Coordinate final inspection\n- Sarah: Test all equipment\n- John: Update timeline',
        next_meeting: '2025-04-15',
        created_by: user.id
      }
    ]);
    console.log(`✅ Created ${meetingMinutes.length} meeting minutes\n`);

    // ========== COMMUNICATION LOGS ==========
    console.log('💬 Creating Communication Logs...');
    const communicationLogs = await models.CommunicationLog.bulkCreate([
      {
        project_id: project.id,
        communication_date: '2025-01-20',
        communication_type: 'email',
        subject: 'Permit Application Status',
        recipient: 'City Planning Department',
        message: 'Following up on building permit application submitted January 10. Requesting status update.',
        response: 'Permit approved. Will be ready for pickup January 25.',
        sender_id: user.id
      },
      {
        project_id: project.id,
        communication_date: '2025-02-01',
        communication_type: 'phone',
        subject: 'Kitchen Equipment Delivery',
        recipient: 'Restaurant Supply Co.',
        message: 'Confirmed delivery date for commercial oven and refrigeration units.',
        response: 'Delivery scheduled for February 28. Installation team will arrive March 1.',
        sender_id: user.id
      },
      {
        project_id: project.id,
        communication_date: '2025-02-15',
        communication_type: 'meeting',
        subject: 'Vendor Coordination',
        recipient: 'All Vendors',
        message: 'Coordinated delivery schedules to avoid conflicts. Confirmed access times.',
        response: 'All vendors confirmed their delivery windows.',
        sender_id: user.id
      },
      {
        project_id: project.id,
        communication_date: '2025-03-05',
        communication_type: 'email',
        subject: 'Menu Approval',
        recipient: 'Project Stakeholders',
        message: 'Sent final menu for review and approval. Includes pricing and descriptions.',
        response: 'Menu approved with minor adjustments to pricing.',
        sender_id: user.id
      },
      {
        project_id: project.id,
        communication_date: '2025-03-20',
        communication_type: 'phone',
        subject: 'Marketing Campaign Launch',
        recipient: 'Marketing Agency',
        message: 'Discussed social media campaign for grand opening. Reviewed timeline and budget.',
        response: 'Campaign approved. Will launch April 1.',
        sender_id: user.id
      },
      {
        project_id: project.id,
        communication_date: '2025-04-10',
        communication_type: 'email',
        subject: 'Staff Hiring Update',
        recipient: 'HR Department',
        message: 'Update on hiring progress. 8 of 12 positions filled.',
        response: 'Remaining interviews scheduled for next week.',
        sender_id: user.id
      }
    ]);
    console.log(`✅ Created ${communicationLogs.length} communication logs\n`);

    console.log('✅ Communications data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${statusReports.length} Status Reports`);
    console.log(`   - ${meetingMinutes.length} Meeting Minutes`);
    console.log(`   - ${communicationLogs.length} Communication Logs`);

  } catch (error) {
    console.error('❌ Error seeding communications data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCommunicationsData()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = seedCommunicationsData;
