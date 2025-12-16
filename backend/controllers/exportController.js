const googleSheetsService = require('../utils/googleSheetsService');
const { 
  Project, 
  ProjectDocument, 
  Task, 
  Milestone, 
  Budget, 
  Expense, 
  Risk, 
  QualityMetric,
  Defect,
  ChangeRequest,
  Stakeholder,
  User
} = require('../models');

/**
 * Export Controller for Google Sheets
 * Handles exporting various project data to Google Sheets
 */

/**
 * Export project documents to Google Sheets
 */
exports.exportDocumentsToSheets = async (req, res) => {
  try {
    const { id } = req.params;
    const { spreadsheetId } = req.body; // Optional: export to existing sheet

    // Get project
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get all documents for the project
    const documents = await ProjectDocument.findAll({
      where: { project_id: id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    // Prepare data for Google Sheets
    const headers = [
      'Document ID',
      'Title',
      'Description',
      'Category',
      'File Name',
      'File Type',
      'File Size (KB)',
      'Version',
      'Status',
      'Uploaded By',
      'Uploaded Date',
      'Tags',
      'Is Archived'
    ];

    const rows = documents.map(doc => [
      doc.id,
      doc.title || '',
      doc.description || '',
      doc.category || '',
      doc.file_name || '',
      doc.file_type || '',
      doc.file_size ? (doc.file_size / 1024).toFixed(2) : '',
      doc.version || '1.0',
      doc.status || 'active',
      doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : '',
      doc.created_at ? new Date(doc.created_at).toLocaleString() : '',
      doc.tags ? doc.tags.join(', ') : '',
      doc.is_archived ? 'Yes' : 'No'
    ]);

    const data = [headers, ...rows];

    // Export to Google Sheets
    const result = await googleSheetsService.exportToSheet(
      data,
      `${project.name} - Documents`,
      spreadsheetId
    );

    res.json({
      success: true,
      message: 'Documents exported to Google Sheets successfully',
      data: {
        spreadsheetId: result.spreadsheetId,
        url: result.url,
        documentCount: documents.length
      }
    });

  } catch (error) {
    console.error('Error exporting documents to Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export documents to Google Sheets',
      error: error.message
    });
  }
};

/**
 * Export project tasks to Google Sheets
 */
exports.exportTasksToSheets = async (req, res) => {
  try {
    const { id } = req.params;
    const { spreadsheetId } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const tasks = await Task.findAll({
      where: { project_id: id },
      order: [['start_date', 'ASC']],
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    const headers = [
      'Task ID',
      'Name',
      'Description',
      'Status',
      'Priority',
      'Start Date',
      'End Date',
      'Progress (%)',
      'Assigned To',
      'Estimated Hours',
      'Actual Hours'
    ];

    const rows = tasks.map(task => [
      task.id,
      task.name,
      task.description || '',
      task.status,
      task.priority || '',
      task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
      task.end_date ? new Date(task.end_date).toLocaleDateString() : '',
      task.progress || 0,
      task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : '',
      task.estimated_hours || '',
      task.actual_hours || ''
    ]);

    const data = [headers, ...rows];

    const result = await googleSheetsService.exportToSheet(
      data,
      `${project.name} - Tasks`,
      spreadsheetId
    );

    res.json({
      success: true,
      message: 'Tasks exported to Google Sheets successfully',
      data: {
        spreadsheetId: result.spreadsheetId,
        url: result.url,
        taskCount: tasks.length
      }
    });

  } catch (error) {
    console.error('Error exporting tasks to Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export tasks to Google Sheets',
      error: error.message
    });
  }
};

/**
 * Export project budget and expenses to Google Sheets
 */
exports.exportBudgetToSheets = async (req, res) => {
  try {
    const { id } = req.params;
    const { spreadsheetId } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const budgets = await Budget.findAll({
      where: { project_id: id },
      order: [['created_at', 'ASC']]
    });

    const expenses = await Expense.findAll({
      where: { project_id: id },
      order: [['expense_date', 'DESC']]
    });

    // Create budget sheet data
    const budgetHeaders = [
      'Budget ID',
      'Category',
      'Planned Amount',
      'Allocated Amount',
      'Spent Amount',
      'Status',
      'Created Date'
    ];

    const budgetRows = budgets.map(budget => [
      budget.id,
      budget.category,
      parseFloat(budget.planned_amount || 0).toFixed(2),
      parseFloat(budget.allocated_amount || 0).toFixed(2),
      parseFloat(budget.spent_amount || 0).toFixed(2),
      budget.status || '',
      budget.created_at ? new Date(budget.created_at).toLocaleDateString() : ''
    ]);

    // Create expenses sheet data
    const expenseHeaders = [
      'Expense ID',
      'Category',
      'Description',
      'Amount',
      'Expense Date',
      'Vendor',
      'Status',
      'Created Date'
    ];

    const expenseRows = expenses.map(expense => [
      expense.id,
      expense.category || '',
      expense.description || '',
      parseFloat(expense.amount || 0).toFixed(2),
      expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '',
      expense.vendor || '',
      expense.status || '',
      expense.created_at ? new Date(expense.created_at).toLocaleDateString() : ''
    ]);

    // Export budgets
    const budgetData = [budgetHeaders, ...budgetRows];
    const result = await googleSheetsService.exportToSheet(
      budgetData,
      `${project.name} - Budget`,
      spreadsheetId
    );

    // Export expenses to the same spreadsheet
    const expenseData = [expenseHeaders, ...expenseRows];
    await googleSheetsService.exportToSheet(
      expenseData,
      `${project.name} - Expenses`,
      result.spreadsheetId
    );

    res.json({
      success: true,
      message: 'Budget and expenses exported to Google Sheets successfully',
      data: {
        spreadsheetId: result.spreadsheetId,
        url: result.url,
        budgetCount: budgets.length,
        expenseCount: expenses.length
      }
    });

  } catch (error) {
    console.error('Error exporting budget to Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export budget to Google Sheets',
      error: error.message
    });
  }
};

/**
 * Export project risks to Google Sheets
 */
exports.exportRisksToSheets = async (req, res) => {
  try {
    const { id } = req.params;
    const { spreadsheetId } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const risks = await Risk.findAll({
      where: { project_id: id },
      order: [['risk_score', 'DESC']],
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'first_name', 'last_name']
        }
      ]
    });

    const headers = [
      'Risk ID',
      'Title',
      'Description',
      'Category',
      'Probability',
      'Impact',
      'Risk Score',
      'Status',
      'Mitigation Strategy',
      'Owner',
      'Identified Date',
      'Last Updated'
    ];

    const rows = risks.map(risk => [
      risk.id,
      risk.title,
      risk.description || '',
      risk.category || '',
      risk.probability || '',
      risk.impact || '',
      risk.risk_score || '',
      risk.status,
      risk.mitigation_strategy || '',
      risk.owner ? `${risk.owner.first_name} ${risk.owner.last_name}` : '',
      risk.identified_date ? new Date(risk.identified_date).toLocaleDateString() : '',
      risk.updated_at ? new Date(risk.updated_at).toLocaleDateString() : ''
    ]);

    const data = [headers, ...rows];

    const result = await googleSheetsService.exportToSheet(
      data,
      `${project.name} - Risks`,
      spreadsheetId
    );

    res.json({
      success: true,
      message: 'Risks exported to Google Sheets successfully',
      data: {
        spreadsheetId: result.spreadsheetId,
        url: result.url,
        riskCount: risks.length
      }
    });

  } catch (error) {
    console.error('Error exporting risks to Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export risks to Google Sheets',
      error: error.message
    });
  }
};

/**
 * Export complete project data to Google Sheets (all tabs)
 */
exports.exportCompleteProjectToSheets = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Create a new spreadsheet for the complete export
    let spreadsheetId = null;

    // Export documents
    const documents = await ProjectDocument.findAll({
      where: { project_id: id },
      include: [{ model: User, as: 'uploader', attributes: ['first_name', 'last_name'] }]
    });

    const docData = [
      ['Document ID', 'Title', 'Category', 'File Name', 'Uploaded By', 'Upload Date'],
      ...documents.map(doc => [
        doc.id,
        doc.title || '',
        doc.category || '',
        doc.file_name || '',
        doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : '',
        doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''
      ])
    ];

    const result = await googleSheetsService.exportToSheet(
      docData,
      'Documents',
      null
    );
    spreadsheetId = result.spreadsheetId;

    // Export tasks
    const tasks = await Task.findAll({
      where: { project_id: id },
      include: [{ model: User, as: 'assignee', attributes: ['first_name', 'last_name'] }]
    });

    const taskData = [
      ['Task ID', 'Name', 'Status', 'Priority', 'Start Date', 'End Date', 'Progress', 'Assigned To'],
      ...tasks.map(task => [
        task.id,
        task.name,
        task.status,
        task.priority || '',
        task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
        task.end_date ? new Date(task.end_date).toLocaleDateString() : '',
        task.progress || 0,
        task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : ''
      ])
    ];

    await googleSheetsService.exportToSheet(taskData, 'Tasks', spreadsheetId);

    // Export risks
    const risks = await Risk.findAll({
      where: { project_id: id },
      include: [{ model: User, as: 'owner', attributes: ['first_name', 'last_name'] }]
    });

    const riskData = [
      ['Risk ID', 'Title', 'Probability', 'Impact', 'Risk Score', 'Status', 'Owner'],
      ...risks.map(risk => [
        risk.id,
        risk.title,
        risk.probability || '',
        risk.impact || '',
        risk.risk_score || '',
        risk.status,
        risk.owner ? `${risk.owner.first_name} ${risk.owner.last_name}` : ''
      ])
    ];

    await googleSheetsService.exportToSheet(riskData, 'Risks', spreadsheetId);

    // Export budget
    const budgets = await Budget.findAll({ where: { project_id: id } });
    const budgetData = [
      ['Budget ID', 'Category', 'Planned Amount', 'Spent Amount', 'Status'],
      ...budgets.map(budget => [
        budget.id,
        budget.category,
        parseFloat(budget.planned_amount || 0).toFixed(2),
        parseFloat(budget.spent_amount || 0).toFixed(2),
        budget.status || ''
      ])
    ];

    await googleSheetsService.exportToSheet(budgetData, 'Budget', spreadsheetId);

    res.json({
      success: true,
      message: 'Complete project data exported to Google Sheets successfully',
      data: {
        spreadsheetId: result.spreadsheetId,
        url: result.url,
        sheets: ['Documents', 'Tasks', 'Risks', 'Budget']
      }
    });

  } catch (error) {
    console.error('Error exporting complete project to Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export complete project to Google Sheets',
      error: error.message
    });
  }
};

/**
 * Check Google Sheets service status
 */
exports.checkGoogleSheetsStatus = async (req, res) => {
  try {
    const initialized = await googleSheetsService.initialize();
    
    res.json({
      success: true,
      data: {
        configured: initialized,
        status: initialized ? 'Ready' : 'Not configured',
        message: initialized 
          ? 'Google Sheets integration is ready'
          : 'Google Sheets credentials not found. Please configure google-credentials.json'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking Google Sheets status',
      error: error.message
    });
  }
};
