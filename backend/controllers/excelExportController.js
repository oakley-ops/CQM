const ExcelJS = require('exceljs');
const { 
  Project, 
  ProjectDocument, 
  Task, 
  Budget, 
  Expense, 
  Risk, 
  User
} = require('../models');

/**
 * Excel Export Controller (No Google API Required)
 * Downloads Excel files directly - compatible with Google Sheets
 */

/**
 * Export project documents to Excel
 */
exports.exportDocumentsToExcel = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

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

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Documents');

    // Add title
    worksheet.mergeCells('A1:M1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = `${project.name} - Documents Export`;
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };

    // Add export date
    worksheet.mergeCells('A2:M2');
    const dateRow = worksheet.getCell('A2');
    dateRow.value = `Exported: ${new Date().toLocaleString()}`;
    dateRow.font = { italic: true };
    dateRow.alignment = { horizontal: 'center' };

    // Add headers
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

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    documents.forEach(doc => {
      worksheet.addRow([
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
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Documents_${Date.now()}.xlsx"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting documents to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export documents to Excel',
      error: error.message
    });
  }
};

/**
 * Export project tasks to Excel
 */
exports.exportTasksToExcel = async (req, res) => {
  try {
    const { id } = req.params;

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tasks');

    // Title
    worksheet.mergeCells('A1:K1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = `${project.name} - Tasks Export`;
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };

    // Headers
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

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Data
    tasks.forEach(task => {
      worksheet.addRow([
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
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Tasks_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting tasks to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export tasks to Excel',
      error: error.message
    });
  }
};

/**
 * Export project budget to Excel
 */
exports.exportBudgetToExcel = async (req, res) => {
  try {
    const { id } = req.params;

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

    const workbook = new ExcelJS.Workbook();

    // Budget Sheet
    const budgetSheet = workbook.addWorksheet('Budget');
    budgetSheet.mergeCells('A1:G1');
    const budgetTitle = budgetSheet.getCell('A1');
    budgetTitle.value = `${project.name} - Budget`;
    budgetTitle.font = { size: 16, bold: true };
    budgetTitle.alignment = { horizontal: 'center' };

    budgetSheet.addRow([]);
    const budgetHeaders = ['Budget ID', 'Category', 'Planned Amount', 'Allocated Amount', 'Spent Amount', 'Status', 'Created Date'];
    const budgetHeaderRow = budgetSheet.addRow(budgetHeaders);
    budgetHeaderRow.font = { bold: true };
    budgetHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    budgetHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    budgets.forEach(budget => {
      budgetSheet.addRow([
        budget.id,
        budget.category,
        parseFloat(budget.planned_amount || 0).toFixed(2),
        parseFloat(budget.allocated_amount || 0).toFixed(2),
        parseFloat(budget.spent_amount || 0).toFixed(2),
        budget.status || '',
        budget.created_at ? new Date(budget.created_at).toLocaleDateString() : ''
      ]);
    });

    budgetSheet.columns.forEach(column => {
      column.width = 20;
    });

    // Expenses Sheet
    const expenseSheet = workbook.addWorksheet('Expenses');
    expenseSheet.mergeCells('A1:H1');
    const expenseTitle = expenseSheet.getCell('A1');
    expenseTitle.value = `${project.name} - Expenses`;
    expenseTitle.font = { size: 16, bold: true };
    expenseTitle.alignment = { horizontal: 'center' };

    expenseSheet.addRow([]);
    const expenseHeaders = ['Expense ID', 'Category', 'Description', 'Amount', 'Expense Date', 'Vendor', 'Status', 'Created Date'];
    const expenseHeaderRow = expenseSheet.addRow(expenseHeaders);
    expenseHeaderRow.font = { bold: true };
    expenseHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    expenseHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    expenses.forEach(expense => {
      expenseSheet.addRow([
        expense.id,
        expense.category || '',
        expense.description || '',
        parseFloat(expense.amount || 0).toFixed(2),
        expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : '',
        expense.vendor || '',
        expense.status || '',
        expense.created_at ? new Date(expense.created_at).toLocaleDateString() : ''
      ]);
    });

    expenseSheet.columns.forEach(column => {
      column.width = 20;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Budget_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting budget to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export budget to Excel',
      error: error.message
    });
  }
};

/**
 * Export project risks to Excel
 */
exports.exportRisksToExcel = async (req, res) => {
  try {
    const { id } = req.params;

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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Risks');

    worksheet.mergeCells('A1:L1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = `${project.name} - Risks Export`;
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };

    worksheet.addRow([]);
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

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF0000' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    risks.forEach(risk => {
      worksheet.addRow([
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
    });

    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Risks_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting risks to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export risks to Excel',
      error: error.message
    });
  }
};

/**
 * Export complete project to Excel (all data in one file)
 */
exports.exportCompleteProjectToExcel = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const workbook = new ExcelJS.Workbook();

    // Documents Sheet
    const documents = await ProjectDocument.findAll({
      where: { project_id: id },
      include: [{ model: User, as: 'uploader', attributes: ['first_name', 'last_name'] }]
    });

    const docSheet = workbook.addWorksheet('Documents');
    docSheet.addRow([`${project.name} - Complete Export`]);
    docSheet.addRow(['Documents']);
    docSheet.addRow(['Document ID', 'Title', 'Category', 'File Name', 'Uploaded By', 'Upload Date']);
    documents.forEach(doc => {
      docSheet.addRow([
        doc.id,
        doc.title || '',
        doc.category || '',
        doc.file_name || '',
        doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : '',
        doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''
      ]);
    });

    // Tasks Sheet
    const tasks = await Task.findAll({
      where: { project_id: id },
      include: [{ model: User, as: 'assignee', attributes: ['first_name', 'last_name'] }]
    });

    const taskSheet = workbook.addWorksheet('Tasks');
    taskSheet.addRow(['Tasks']);
    taskSheet.addRow(['Task ID', 'Name', 'Status', 'Priority', 'Start Date', 'End Date', 'Progress', 'Assigned To']);
    tasks.forEach(task => {
      taskSheet.addRow([
        task.id,
        task.name,
        task.status,
        task.priority || '',
        task.start_date ? new Date(task.start_date).toLocaleDateString() : '',
        task.end_date ? new Date(task.end_date).toLocaleDateString() : '',
        task.progress || 0,
        task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : ''
      ]);
    });

    // Risks Sheet
    const risks = await Risk.findAll({
      where: { project_id: id },
      include: [{ model: User, as: 'owner', attributes: ['first_name', 'last_name'] }]
    });

    const riskSheet = workbook.addWorksheet('Risks');
    riskSheet.addRow(['Risks']);
    riskSheet.addRow(['Risk ID', 'Title', 'Probability', 'Impact', 'Risk Score', 'Status', 'Owner']);
    risks.forEach(risk => {
      riskSheet.addRow([
        risk.id,
        risk.title,
        risk.probability || '',
        risk.impact || '',
        risk.risk_score || '',
        risk.status,
        risk.owner ? `${risk.owner.first_name} ${risk.owner.last_name}` : ''
      ]);
    });

    // Budget Sheet
    const budgets = await Budget.findAll({ where: { project_id: id } });
    const budgetSheet = workbook.addWorksheet('Budget');
    budgetSheet.addRow(['Budget']);
    budgetSheet.addRow(['Budget ID', 'Category', 'Planned Amount', 'Spent Amount', 'Status']);
    budgets.forEach(budget => {
      budgetSheet.addRow([
        budget.id,
        budget.category,
        parseFloat(budget.planned_amount || 0).toFixed(2),
        parseFloat(budget.spent_amount || 0).toFixed(2),
        budget.status || ''
      ]);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, '_')}_Complete_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting complete project to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export complete project to Excel',
      error: error.message
    });
  }
};
