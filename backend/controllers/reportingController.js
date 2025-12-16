const { Project, Task, Milestone, Budget, Expense, EVMSnapshot, Risk, QualityMetric, QualityInspection, Defect, LessonLearned, ChangeRequest, User } = require('../models');
const { Op } = require('sequelize');
const pdfGenerator = require('../utils/pdfGenerator');

// Get Executive Dashboard
exports.getExecutiveDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Get project with basic info
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({ 
        success: false,
        message: 'Project not found' 
      });
    }

    // Get project manager if exists
    let projectManager = null;
    if (project.project_manager_id) {
      const user = await User.findByPk(project.project_manager_id, {
        attributes: ['id', 'first_name', 'last_name', 'email']
      });
      if (user) {
        projectManager = {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email
        };
      }
    }

    // Get budget summary
    const budgets = await Budget.findAll({ where: { project_id: id } });
    const expenses = await Expense.findAll({ where: { project_id: id } });
    
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.planned_amount || 0), 0);
    const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const budgetVariance = totalBudget - totalSpent;
    const budgetVariancePercent = totalBudget > 0 ? ((budgetVariance / totalBudget) * 100).toFixed(1) : 0;

    // Get latest EVM data
    const latestEVM = await EVMSnapshot.findOne({
      where: { project_id: id },
      order: [['snapshot_date', 'DESC']]
    });

    // Get schedule summary
    const allTasks = await Task.findAll({ where: { project_id: id } });
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const overdueTasks = allTasks.filter(t => {
      if (t.status === 'completed') return false;
      return new Date(t.end_date) < new Date();
    });
    
    const scheduleProgress = allTasks.length > 0 
      ? ((completedTasks.length / allTasks.length) * 100).toFixed(1)
      : 0;

    // Get milestone summary
    const milestones = await Milestone.findAll({ where: { project_id: id } });
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const upcomingMilestones = milestones.filter(m => {
      if (m.status === 'completed') return false;
      const dueDate = new Date(m.due_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return dueDate <= thirtyDaysFromNow;
    });

    // Get quality summary
    const qualityMetrics = await QualityMetric.findAll({ where: { project_id: id } });
    const inspections = await QualityInspection.findAll({ where: { project_id: id } });
    const defects = await Defect.findAll({ where: { project_id: id } });
    
    const passedInspections = inspections.filter(i => i.result === 'pass');
    const qualityPassRate = inspections.length > 0 
      ? ((passedInspections.length / inspections.length) * 100).toFixed(1)
      : 100;
    
    const openDefects = defects.filter(d => d.status === 'open' || d.status === 'in-progress');
    const criticalDefects = openDefects.filter(d => d.severity === 'critical');

    // Get risk summary
    const risks = await Risk.findAll({ where: { project_id: id } });
    const activeRisks = risks.filter(r => r.status !== 'closed');
    const highRisks = activeRisks.filter(r => r.impact === 'high' || r.probability === 'high');
    const criticalRisks = activeRisks.filter(r => r.impact === 'high' && r.probability === 'high');

    // Get recent accomplishments (from lessons learned with positive impact)
    const recentAccomplishments = await LessonLearned.findAll({
      where: { 
        project_id: id,
        impact: 'positive'
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Get active issues (open change requests, critical defects, overdue tasks)
    const openChangeRequests = await ChangeRequest.findAll({
      where: { 
        project_id: id,
        status: { [Op.in]: ['pending', 'under_review'] }
      },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Determine overall status
    let overallStatus = 'on-track';
    let overallStatusColor = 'green';
    
    if (criticalRisks.length > 0 || criticalDefects.length > 0 || budgetVariancePercent < -10) {
      overallStatus = 'at-risk';
      overallStatusColor = 'red';
    } else if (highRisks.length > 0 || overdueTasks.length > 0 || budgetVariancePercent < -5) {
      overallStatus = 'needs-attention';
      overallStatusColor = 'yellow';
    }

    // Determine budget status
    let budgetStatus = 'on-track';
    let budgetStatusColor = 'green';
    if (budgetVariancePercent < -10) {
      budgetStatus = 'over-budget';
      budgetStatusColor = 'red';
    } else if (budgetVariancePercent < -5) {
      budgetStatus = 'at-risk';
      budgetStatusColor = 'yellow';
    }

    // Determine schedule status
    let scheduleStatus = 'on-track';
    let scheduleStatusColor = 'green';
    if (overdueTasks.length > 5) {
      scheduleStatus = 'behind';
      scheduleStatusColor = 'red';
    } else if (overdueTasks.length > 0) {
      scheduleStatus = 'minor-delay';
      scheduleStatusColor = 'yellow';
    }

    // Determine quality status
    let qualityStatus = 'excellent';
    let qualityStatusColor = 'green';
    if (criticalDefects.length > 0 || qualityPassRate < 80) {
      qualityStatus = 'poor';
      qualityStatusColor = 'red';
    } else if (openDefects.length > 5 || qualityPassRate < 90) {
      qualityStatus = 'needs-improvement';
      qualityStatusColor = 'yellow';
    }

    // Determine risk status
    let riskStatus = 'low';
    let riskStatusColor = 'green';
    if (criticalRisks.length > 0) {
      riskStatus = 'high';
      riskStatusColor = 'red';
    } else if (highRisks.length > 0) {
      riskStatus = 'medium';
      riskStatusColor = 'yellow';
    }

    const dashboard = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress || 0,
        startDate: project.start_date,
        endDate: project.end_date,
        projectManager: projectManager
      },
      overallStatus: {
        status: overallStatus,
        color: overallStatusColor,
        label: overallStatus.replace('-', ' ').toUpperCase()
      },
      budget: {
        planned: parseFloat(totalBudget).toFixed(2),
        actual: parseFloat(totalSpent).toFixed(2),
        variance: parseFloat(budgetVariance).toFixed(2),
        variancePercent: parseFloat(budgetVariancePercent),
        status: budgetStatus,
        color: budgetStatusColor,
        cpi: latestEVM ? parseFloat(latestEVM.cpi || 1).toFixed(2) : null
      },
      schedule: {
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        progress: parseFloat(scheduleProgress),
        status: scheduleStatus,
        color: scheduleStatusColor,
        spi: latestEVM ? parseFloat(latestEVM.spi || 1).toFixed(2) : null
      },
      quality: {
        totalInspections: inspections.length,
        passedInspections: passedInspections.length,
        passRate: parseFloat(qualityPassRate),
        totalDefects: defects.length,
        openDefects: openDefects.length,
        criticalDefects: criticalDefects.length,
        status: qualityStatus,
        color: qualityStatusColor
      },
      risks: {
        total: risks.length,
        active: activeRisks.length,
        high: highRisks.length,
        critical: criticalRisks.length,
        status: riskStatus,
        color: riskStatusColor
      },
      milestones: {
        total: milestones.length,
        completed: completedMilestones.length,
        upcoming: upcomingMilestones.map(m => ({
          id: m.id,
          name: m.name,
          dueDate: m.due_date,
          status: m.status
        }))
      },
      recentAccomplishments: recentAccomplishments.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        date: a.created_at
      })),
      activeIssues: [
        ...openChangeRequests.map(cr => ({
          type: 'change-request',
          id: cr.id,
          title: cr.title,
          priority: cr.priority,
          status: cr.status
        })),
        ...criticalDefects.map(d => ({
          type: 'defect',
          id: d.id,
          title: d.title,
          severity: d.severity,
          status: d.status
        })),
        ...overdueTasks.slice(0, 5).map(t => ({
          type: 'overdue-task',
          id: t.id,
          title: t.name,
          dueDate: t.end_date,
          status: t.status
        }))
      ],
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Error generating executive dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating executive dashboard',
      error: error.message 
    });
  }
};

// Get Status Report
exports.getStatusReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    // For now, return a simple status report
    // In the future, this could generate a formatted document
    res.json({
      success: true,
      data: {
        reportType: 'status-report',
        period: period || 'weekly',
        projectId: id,
        generatedAt: new Date(),
        message: 'Status report generated successfully. Use executive dashboard for detailed metrics.'
      }
    });

  } catch (error) {
    console.error('Error generating status report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error generating status report',
      error: error.message 
    });
  }
};

// Export Status Report as PDF
exports.exportStatusReportPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;

    // Get project
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ 
        success: false,
        message: 'Project not found' 
      });
    }

    // Reuse the executive dashboard data gathering logic
    // Get dashboard data by calling the function directly
    const mockReq = { params: { id } };
    let dashboardData = null;
    
    const mockRes = {
      json: (data) => {
        if (data.success) {
          dashboardData = data.data;
        }
      },
      status: (code) => ({
        json: (data) => {
          throw new Error(data.message || 'Failed to get dashboard data');
        }
      })
    };

    await exports.getExecutiveDashboard(mockReq, mockRes);

    if (!dashboardData) {
      throw new Error('Failed to retrieve dashboard data');
    }

    // Add period to the data
    dashboardData.period = period || 'Weekly';

    // Generate PDF
    const pdfBytes = await pdfGenerator.generateStatusReport(dashboardData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Status_Report_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // Send PDF
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error exporting status report PDF:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error exporting status report PDF',
      error: error.message 
    });
  }
};

// Export Executive Dashboard as PDF
exports.exportExecutiveDashboardPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get project
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({ 
        success: false,
        message: 'Project not found' 
      });
    }

    // Get dashboard data
    const mockReq = { params: { id } };
    let dashboardData = null;
    
    const mockRes = {
      json: (data) => {
        if (data.success) {
          dashboardData = data.data;
        }
      },
      status: (code) => ({
        json: (data) => {
          throw new Error(data.message || 'Failed to get dashboard data');
        }
      })
    };

    await exports.getExecutiveDashboard(mockReq, mockRes);

    if (!dashboardData) {
      throw new Error('Failed to retrieve dashboard data');
    }

    // Generate PDF
    const pdfBytes = await pdfGenerator.generateExecutiveDashboard(dashboardData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Executive_Dashboard_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);

    // Send PDF
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error exporting executive dashboard PDF:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error exporting executive dashboard PDF',
      error: error.message 
    });
  }
};
