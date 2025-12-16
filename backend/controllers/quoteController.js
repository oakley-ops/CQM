const { 
  sequelize,
  Quote, 
  Client, 
  User, 
  QuoteMilestone, 
  QuoteMilestoneTracking,
  QuoteAction,
  QuoteDocument,
  QuoteActivityLog,
  Project
} = require('../models');
const { Op } = require('sequelize');
const { PROJECT_STATUS } = require('../config/constants');

// Generate unique quote number
const generateQuoteNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `Q${year}-`;
  
  const lastQuote = await Quote.findOne({
    where: {
      quote_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['created_date', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quote_number.split('-')[1]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Create new quote
exports.createQuote = async (req, res) => {
  try {
    const {
      client_id,
      project_name,
      assigned_to,
      priority,
      deadline,
      notes,
      quote_value,
      probability_percentage
    } = req.body;

    // Generate quote number
    const quote_number = await generateQuoteNumber();

    // Create quote
    const quote = await Quote.create({
      quote_number,
      client_id,
      project_name,
      assigned_to,
      priority: priority || 'Medium',
      status: 'Not Started',
      current_stage: 'Requirements Received',
      deadline,
      notes,
      quote_value,
      probability_percentage: probability_percentage || 50,
      created_by: req.user.id
    });

    // Initialize milestone tracking
    const milestones = await QuoteMilestone.findAll({
      where: { is_active: true },
      order: [['sequence_order', 'ASC']]
    });

    for (const milestone of milestones) {
      await QuoteMilestoneTracking.create({
        quote_id: quote.id,
        milestone_id: milestone.id,
        status: milestone.sequence_order === 1 ? 'In Progress' : 'Not Started',
        assigned_to: assigned_to,
        expected_completion_date: milestone.target_duration_days 
          ? new Date(Date.now() + milestone.target_duration_days * 24 * 60 * 60 * 1000)
          : null
      });
    }

    // Set current milestone to first milestone
    if (milestones.length > 0) {
      quote.current_milestone_id = milestones[0].id;
      await quote.save();
    }

    // Fetch complete quote with associations
    const completeQuote = await Quote.findByPk(quote.id, {
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: QuoteMilestone, as: 'currentMilestone' }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeQuote
    });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating quote',
      error: error.message
    });
  }
};

// Get all quotes with filters
exports.getAllQuotes = async (req, res) => {
  try {
    const {
      status,
      priority,
      assigned_to,
      client_id,
      search,
      page = 1,
      limit = 20,
      sort_by = 'created_date',
      sort_order = 'DESC'
    } = req.query;

    const where = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;
    if (client_id) where.client_id = client_id;
    
    if (search) {
      where[Op.or] = [
        { quote_number: { [Op.iLike]: `%${search}%` } },
        { project_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: quotes } = await Quote.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: QuoteMilestone, as: 'currentMilestone' }
      ],
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: quotes,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quotes',
      error: error.message
    });
  }
};

// Get quote by ID
exports.getQuoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await Quote.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: User, as: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] },
        { model: QuoteMilestone, as: 'currentMilestone' },
        {
          model: QuoteMilestoneTracking,
          as: 'milestoneTracking',
          include: [
            { model: QuoteMilestone, as: 'milestone' },
            { model: User, as: 'assignee', attributes: ['id', 'email', 'first_name', 'last_name'] }
          ],
          order: [['milestone', 'sequence_order', 'ASC']]
        },
        {
          model: QuoteAction,
          as: 'actions',
          include: [
            { model: User, as: 'assignee', attributes: ['id', 'email', 'first_name', 'last_name'] }
          ]
        },
        {
          model: QuoteDocument,
          as: 'documents',
          include: [
            { model: User, as: 'uploader', attributes: ['id', 'email', 'first_name', 'last_name'] }
          ]
        },
        {
          model: QuoteActivityLog,
          as: 'activityLog',
          include: [
            { model: User, as: 'user', attributes: ['id', 'email', 'first_name', 'last_name'] }
          ],
          order: [['created_at', 'DESC']],
          limit: 50
        }
      ]
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quote',
      error: error.message
    });
  }
};

// Update quote
exports.updateQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const quote = await Quote.findByPk(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    await quote.update(updates);

    const updatedQuote = await Quote.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: QuoteMilestone, as: 'currentMilestone' }
      ]
    });

    res.json({
      success: true,
      data: updatedQuote
    });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quote',
      error: error.message
    });
  }
};

// Update quote status
exports.updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const quote = await Quote.findByPk(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // If trying to set status to Completed, verify all milestones are done
    if (status === 'Completed') {
      const incompleteMilestones = await QuoteMilestoneTracking.count({
        where: {
          quote_id: id,
          status: { [Op.ne]: 'Completed' }
        }
      });

      if (incompleteMilestones > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot mark quote as completed. All milestones must be completed first. Use "Next Stage" to progress through milestones.'
        });
      }
      
      quote.completed_date = new Date();
    }

    quote.status = status;
    await quote.save();

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    console.error('Error updating quote status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating quote status',
      error: error.message
    });
  }
};

// Move quote to next stage/milestone
exports.moveToNextStage = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await Quote.findByPk(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // Get current milestone
    let currentMilestone = await QuoteMilestone.findByPk(quote.current_milestone_id);
    
    // If no current milestone is set, initialize with the first milestone
    if (!currentMilestone) {
      const firstMilestone = await QuoteMilestone.findOne({
        where: { is_active: true },
        order: [['sequence_order', 'ASC']]
      });
      
      if (!firstMilestone) {
        return res.status(400).json({
          success: false,
          message: 'No active milestones found in the system. Please set up milestones first.'
        });
      }
      
      // Initialize milestone tracking if it doesn't exist
      const existingTracking = await QuoteMilestoneTracking.findOne({
        where: { quote_id: id, milestone_id: firstMilestone.id }
      });
      
      if (!existingTracking) {
        // Create milestone tracking for all milestones
        const allMilestones = await QuoteMilestone.findAll({
          where: { is_active: true },
          order: [['sequence_order', 'ASC']]
        });
        
        for (const milestone of allMilestones) {
          await QuoteMilestoneTracking.create({
            quote_id: id,
            milestone_id: milestone.id,
            status: milestone.id === firstMilestone.id ? 'In Progress' : 'Not Started',
            assigned_to: quote.assigned_to
          });
        }
      }
      
      // Set current milestone
      quote.current_milestone_id = firstMilestone.id;
      quote.current_stage = firstMilestone.name;
      await quote.save();
      currentMilestone = firstMilestone;
    }

    // Mark current milestone as completed
    await QuoteMilestoneTracking.update(
      { status: 'Completed', completed_date: new Date() },
      { where: { quote_id: id, milestone_id: currentMilestone.id } }
    );

    // Find next milestone
    const nextMilestone = await QuoteMilestone.findOne({
      where: {
        sequence_order: currentMilestone.sequence_order + 1,
        is_active: true
      }
    });

    if (nextMilestone) {
      // Update quote to next milestone
      quote.current_milestone_id = nextMilestone.id;
      quote.current_stage = nextMilestone.name;
      await quote.save();

      // Mark next milestone as in progress
      await QuoteMilestoneTracking.update(
        { status: 'In Progress', started_date: new Date() },
        { where: { quote_id: id, milestone_id: nextMilestone.id } }
      );
    } else {
      // No more milestones, mark quote as completed
      quote.status = 'Completed';
      quote.completed_date = new Date();
      await quote.save();
    }

    const updatedQuote = await Quote.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: QuoteMilestone, as: 'currentMilestone' }
      ]
    });

    res.json({
      success: true,
      data: updatedQuote
    });
  } catch (error) {
    console.error('Error moving to next stage:', error);
    res.status(500).json({
      success: false,
      message: 'Error moving to next stage',
      error: error.message
    });
  }
};

// Delete quote
exports.deleteQuote = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await Quote.findByPk(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    await quote.destroy();

    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting quote',
      error: error.message
    });
  }
};

// Get quote statistics
exports.getQuoteStatistics = async (req, res) => {
  try {
    const totalQuotes = await Quote.count();
    const activeQuotes = await Quote.count({ where: { status: 'In Process' } });
    const completedQuotes = await Quote.count({ where: { status: 'Completed' } });
    const onHoldQuotes = await Quote.count({ where: { status: 'On Hold' } });
    
    const quotesByPriority = await Quote.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    const quotesByStage = await Quote.findAll({
      attributes: [
        'current_stage',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { status: 'In Process' },
      group: ['current_stage']
    });

    // Calculate average days in process
    const avgDaysResult = await Quote.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('days_in_process')), 'avg_days']
      ],
      where: { status: 'In Process' }
    });

    // Calculate conversion rate
    const signedQuotes = await Quote.count({ where: { signed_date: { [Op.ne]: null } } });
    const conversionRate = totalQuotes > 0 ? ((signedQuotes / totalQuotes) * 100).toFixed(2) : 0;

    // Calculate total pipeline value
    const pipelineValue = await Quote.sum('quote_value', {
      where: { status: { [Op.in]: ['In Process', 'Not Started'] } }
    });

    res.json({
      success: true,
      data: {
        total_quotes: totalQuotes,
        active_quotes: activeQuotes,
        completed_quotes: completedQuotes,
        on_hold_quotes: onHoldQuotes,
        conversion_rate: parseFloat(conversionRate),
        avg_days_in_process: avgDaysResult?.dataValues?.avg_days || 0,
        pipeline_value: pipelineValue || 0,
        quotes_by_priority: quotesByPriority,
        quotes_by_stage: quotesByStage
      }
    });
  } catch (error) {
    console.error('Error fetching quote statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quote statistics',
      error: error.message
    });
  }
};

// Convert quote to project
exports.convertToProject = async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await Quote.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee' }
      ]
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    // Check if already converted
    if (quote.project_id) {
      return res.status(400).json({
        success: false,
        message: 'Quote has already been converted to a project',
        project_id: quote.project_id
      });
    }

    // Check if quote is completed
    if (quote.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Quote must be completed before converting to a project'
      });
    }

    // Verify all milestones are actually completed
    const incompleteMilestones = await QuoteMilestoneTracking.count({
      where: {
        quote_id: id,
        status: { [Op.ne]: 'Completed' }
      }
    });

    if (incompleteMilestones > 0) {
      return res.status(400).json({
        success: false,
        message: 'All milestones must be completed before converting to a project'
      });
    }

    // Create project from quote
    const project = await Project.create({
      name: quote.project_name,
      description: quote.notes || `Project created from quote ${quote.quote_number}`,
      start_date: new Date(),
      status: PROJECT_STATUS.PLANNING,
      project_manager_id: quote.assigned_to,
      budget: quote.quote_value || 0,
      progress: 0
    });

    // Update quote with project reference
    quote.project_id = project.id;
    quote.converted_to_project_date = new Date();
    await quote.save();

    // Log the conversion
    await QuoteActivityLog.create({
      quote_id: quote.id,
      user_id: req.user.id,
      action: 'Converted to Project',
      description: `Quote converted to project #${project.id}`,
      timestamp: new Date()
    });

    const updatedQuote = await Quote.findByPk(id, {
      include: [
        { model: Client, as: 'client' },
        { model: User, as: 'assignee' },
        { model: Project, as: 'project' }
      ]
    });

    res.json({
      success: true,
      message: 'Quote successfully converted to project',
      data: {
        quote: updatedQuote,
        project: project
      }
    });
  } catch (error) {
    console.error('Error converting quote to project:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting quote to project',
      error: error.message
    });
  }
};
