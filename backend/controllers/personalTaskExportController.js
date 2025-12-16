const { PersonalTask } = require('../models');
const ExcelJS = require('exceljs');

// Format date for display
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Get priority color (hex)
const getPriorityColorHex = (priority) => {
  switch (priority) {
    case 'Critical': return 'FFE63946';
    case 'High': return 'FFFF9500';
    case 'Medium': return 'FF007AFF';
    case 'Low': return 'FF8E8E93';
    default: return 'FF000000';
  }
};

// Get status color (hex)
const getStatusColorHex = (status) => {
  switch (status) {
    case 'Completed': return 'FF34C759';
    case 'In Progress': return 'FF007AFF';
    case 'Not Started': return 'FF8E8E93';
    case 'Cancelled': return 'FF8E8E93';
    default: return 'FF000000';
  }
};

// Format task type
const formatTaskType = (type) => {
  const types = {
    'todo': 'To-Do',
    'weekly_priority': 'Weekly Priority',
    'weekly_plan': 'Weekly Plan',
    '30_day': '30-Day Plan',
    '60_day': '60-Day Plan',
    'training': 'Training',
    'event': 'Event',
  };
  return types[type] || type;
};

// Add All Tasks sheet
function addAllTasksSheet(workbook, tasks) {
  const worksheet = workbook.addWorksheet('All Tasks');
  
  // Add headers
  worksheet.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Start Date', key: 'start_date', width: 15 },
    { header: 'Due Date', key: 'due_date', width: 15 },
    { header: 'Tags', key: 'tags', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  tasks.forEach((task, index) => {
    const row = worksheet.addRow({
      num: index + 1,
      type: formatTaskType(task.task_type),
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      start_date: formatDate(task.start_date),
      due_date: formatDate(task.due_date),
      tags: task.tags ? task.tags.join(', ') : '',
      notes: task.notes || '',
    });

    // Alternating row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }

    // Color code priority
    const priorityCell = row.getCell('priority');
    priorityCell.font = { bold: true, color: { argb: getPriorityColorHex(task.priority) } };

    // Color code status
    const statusCell = row.getCell('status');
    statusCell.font = { bold: true, color: { argb: getStatusColorHex(task.status) } };
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// Add task type specific sheet
function addTaskTypeSheet(workbook, sheetName, tasks) {
  if (tasks.length === 0) return;

  const worksheet = workbook.addWorksheet(sheetName);
  
  // Add headers
  worksheet.columns = [
    { header: '#', key: 'num', width: 5 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Start Date', key: 'start_date', width: 15 },
    { header: 'Due Date', key: 'due_date', width: 15 },
    { header: 'Tags', key: 'tags', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  tasks.forEach((task, index) => {
    const row = worksheet.addRow({
      num: index + 1,
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      start_date: formatDate(task.start_date),
      due_date: formatDate(task.due_date),
      tags: task.tags ? task.tags.join(', ') : '',
      notes: task.notes || '',
    });

    // Alternating row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }

    // Color code priority
    const priorityCell = row.getCell('priority');
    priorityCell.font = { bold: true, color: { argb: getPriorityColorHex(task.priority) } };

    // Color code status
    const statusCell = row.getCell('status');
    statusCell.font = { bold: true, color: { argb: getStatusColorHex(task.status) } };
  });

  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
}

// Add summary sheet
function addSummarySheet(workbook, tasks) {
  const worksheet = workbook.addWorksheet('Summary');
  
  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'My Tasks Summary';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  
  worksheet.getRow(2).getCell(1).value = 'Generated:';
  worksheet.getRow(2).getCell(2).value = new Date().toLocaleString();
  
  // Task Type Summary
  worksheet.getRow(4).getCell(1).value = 'Task Type';
  worksheet.getRow(4).getCell(2).value = 'Count';
  worksheet.getRow(4).font = { bold: true };
  
  worksheet.getRow(5).values = ['To-Do List', tasks.filter(t => t.task_type === 'todo').length];
  worksheet.getRow(6).values = ['Weekly Priorities', tasks.filter(t => t.task_type === 'weekly_priority').length];
  worksheet.getRow(7).values = ['Weekly Plan', tasks.filter(t => t.task_type === 'weekly_plan').length];
  worksheet.getRow(8).values = ['30-Day Plan', tasks.filter(t => t.task_type === '30_day').length];
  worksheet.getRow(9).values = ['60-Day Plan', tasks.filter(t => t.task_type === '60_day').length];
  worksheet.getRow(10).values = ['Training', tasks.filter(t => t.task_type === 'training').length];
  worksheet.getRow(11).values = ['Events', tasks.filter(t => t.task_type === 'event').length];
  
  // Status Summary
  worksheet.getRow(13).getCell(1).value = 'Status';
  worksheet.getRow(13).getCell(2).value = 'Count';
  worksheet.getRow(13).font = { bold: true };
  
  worksheet.getRow(14).values = ['Not Started', tasks.filter(t => t.status === 'Not Started').length];
  worksheet.getRow(15).values = ['In Progress', tasks.filter(t => t.status === 'In Progress').length];
  worksheet.getRow(16).values = ['Completed', tasks.filter(t => t.status === 'Completed').length];
  worksheet.getRow(17).values = ['Cancelled', tasks.filter(t => t.status === 'Cancelled').length];
  
  // Priority Summary
  worksheet.getRow(19).getCell(1).value = 'Priority';
  worksheet.getRow(19).getCell(2).value = 'Count';
  worksheet.getRow(19).font = { bold: true };
  
  worksheet.getRow(20).values = ['Critical', tasks.filter(t => t.priority === 'Critical').length];
  worksheet.getRow(21).values = ['High', tasks.filter(t => t.priority === 'High').length];
  worksheet.getRow(22).values = ['Medium', tasks.filter(t => t.priority === 'Medium').length];
  worksheet.getRow(23).values = ['Low', tasks.filter(t => t.priority === 'Low').length];
  
  // Total
  worksheet.getRow(25).getCell(1).value = 'Total Tasks';
  worksheet.getRow(25).getCell(2).value = tasks.length;
  worksheet.getRow(25).font = { bold: true, size: 12 };
  
  // Set column widths
  worksheet.getColumn(1).width = 20;
  worksheet.getColumn(2).width = 15;
}

// Export all tasks to Excel file
exports.exportToExcel = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all tasks
    const tasks = await PersonalTask.findAll({
      where: { user_id: userId },
      order: [
        ['task_type', 'ASC'],
        ['sequence_order', 'ASC'],
        ['due_date', 'ASC'],
      ],
    });

    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tasks to export',
      });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PMBOK Task Manager';
    workbook.created = new Date();

    // Add worksheets
    addAllTasksSheet(workbook, tasks);
    addTaskTypeSheet(workbook, 'To-Do List', tasks.filter(t => t.task_type === 'todo'));
    addTaskTypeSheet(workbook, 'Weekly Priorities', tasks.filter(t => t.task_type === 'weekly_priority'));
    addTaskTypeSheet(workbook, 'Weekly Plan', tasks.filter(t => t.task_type === 'weekly_plan'));
    addTaskTypeSheet(workbook, '30-60 Day Plan', tasks.filter(t => ['30_day', '60_day'].includes(t.task_type)));
    addTaskTypeSheet(workbook, 'Training & Events', tasks.filter(t => ['training', 'event'].includes(t.task_type)));
    addSummarySheet(workbook, tasks);

    // Set response headers for file download
    const filename = `My_Tasks_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting tasks',
      error: error.message,
    });
  }
};
