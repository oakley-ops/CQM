const { sequelize, Quote, QuoteMilestoneTracking } = require('./models');
const { Op } = require('sequelize');

async function fixQuoteStatus() {
  try {
    console.log('Checking quotes with incorrect status...');
    
    // Find all quotes marked as Completed
    const completedQuotes = await Quote.findAll({
      where: { status: 'Completed' }
    });

    for (const quote of completedQuotes) {
      // Check if all milestones are actually completed
      const incompleteMilestones = await QuoteMilestoneTracking.count({
        where: {
          quote_id: quote.id,
          status: { [Op.ne]: 'Completed' }
        }
      });

      if (incompleteMilestones > 0) {
        console.log(`\nQuote ${quote.quote_number} (ID: ${quote.id}):`);
        console.log(`  - Status: Completed (INCORRECT)`);
        console.log(`  - Incomplete milestones: ${incompleteMilestones}`);
        
        // Find the current milestone (last completed one)
        const lastCompletedMilestone = await QuoteMilestoneTracking.findOne({
          where: {
            quote_id: quote.id,
            status: 'Completed'
          },
          include: [{
            association: 'milestone',
            required: true
          }],
          order: [['milestone', 'sequence_order', 'DESC']]
        });

        if (lastCompletedMilestone) {
          // Update quote status to In Process
          quote.status = 'In Process';
          quote.completed_date = null;
          
          // Set current milestone to the next one after last completed
          const nextMilestone = await sequelize.models.QuoteMilestone.findOne({
            where: {
              sequence_order: lastCompletedMilestone.milestone.sequence_order + 1,
              is_active: true
            }
          });

          if (nextMilestone) {
            quote.current_milestone_id = nextMilestone.id;
            quote.current_stage = nextMilestone.name;
            
            // Update the next milestone to In Progress
            await QuoteMilestoneTracking.update(
              { status: 'In Progress', started_date: new Date() },
              { where: { quote_id: quote.id, milestone_id: nextMilestone.id } }
            );
            
            console.log(`  ✅ Fixed: Status set to "In Process", current milestone: ${nextMilestone.name}`);
          } else {
            console.log(`  ⚠️  No next milestone found`);
          }
          
          await quote.save();
        } else {
          // No completed milestones - reset to first milestone
          console.log(`  ⚠️  No completed milestones found - resetting to first milestone`);
          
          const firstMilestone = await sequelize.models.QuoteMilestone.findOne({
            where: { is_active: true },
            order: [['sequence_order', 'ASC']]
          });

          if (firstMilestone) {
            quote.status = 'Not Started';
            quote.completed_date = null;
            quote.current_milestone_id = firstMilestone.id;
            quote.current_stage = firstMilestone.name;
            
            // Set first milestone to Not Started (or In Progress if you prefer)
            await QuoteMilestoneTracking.update(
              { status: 'Not Started', started_date: null, completed_date: null },
              { where: { quote_id: quote.id } }
            );
            
            await quote.save();
            console.log(`  ✅ Fixed: Status set to "Not Started", current milestone: ${firstMilestone.name}`);
          } else {
            console.log(`  ⚠️  No milestones found in system`);
          }
        }
      } else {
        console.log(`\n✅ Quote ${quote.quote_number} is correctly marked as Completed`);
      }
    }

    console.log('\n✅ Quote status fix completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing quote status:', error);
    process.exit(1);
  }
}

fixQuoteStatus();
