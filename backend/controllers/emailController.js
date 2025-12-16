const emailService = require('../utils/emailService');
const { Project, User } = require('../models');

/**
 * Email Controller for sending reports and notifications
 */

/**
 * Verify email service configuration
 */
exports.verifyEmailConfig = async (req, res) => {
  try {
    emailService.initialize();
    const result = await emailService.verifyConnection();
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Send Executive Dashboard via Email
 */
exports.sendExecutiveDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipients, includeUrl } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient email is required'
      });
    }

    // Get project
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Import the reporting controller to get dashboard data
    const reportingController = require('./reportingController');
    
    // Create a mock request/response to get dashboard data
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

    await reportingController.getExecutiveDashboard(mockReq, mockRes);

    if (!dashboardData) {
      throw new Error('Failed to retrieve dashboard data');
    }

    // Generate report URL if requested
    const reportUrl = includeUrl 
      ? `${process.env.CORS_ORIGIN}/projects/${id}/reports/executive`
      : null;

    // Initialize email service
    emailService.initialize();

    // Send email
    const result = await emailService.sendExecutiveDashboard({
      to: recipients,
      projectName: project.name,
      dashboardData,
      reportUrl
    });

    res.json({
      success: true,
      message: `Executive dashboard sent to ${recipients.length} recipient(s)`,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending executive dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send executive dashboard',
      error: error.message
    });
  }
};

/**
 * Send Status Report via Email
 */
exports.sendStatusReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipients, period, includeUrl } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient email is required'
      });
    }

    // Get project
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Generate report URL if requested
    const reportUrl = includeUrl 
      ? `${process.env.CORS_ORIGIN}/projects/${id}/reports/status`
      : null;

    // Initialize email service
    emailService.initialize();

    // Send email
    const result = await emailService.sendStatusReport({
      to: recipients,
      projectName: project.name,
      period: period || 'Weekly',
      reportData: {},
      reportUrl
    });

    res.json({
      success: true,
      message: `Status report sent to ${recipients.length} recipient(s)`,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending status report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send status report',
      error: error.message
    });
  }
};

/**
 * Send Custom Email
 */
exports.sendCustomEmail = async (req, res) => {
  try {
    const { recipients, subject, message, attachments } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient email is required'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Initialize email service
    emailService.initialize();

    // Send email
    const result = await emailService.sendCustomReport({
      to: recipients,
      subject,
      message,
      attachments: attachments || []
    });

    res.json({
      success: true,
      message: `Email sent to ${recipients.length} recipient(s)`,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
};

/**
 * Send Test Email
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { recipient } = req.body;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }

    // Initialize email service
    emailService.initialize();

    // Send test email
    const result = await emailService.sendEmail({
      to: recipient,
      subject: 'Test Email from PMBOK System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email from the PMBOK Project Management System.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};

/**
 * Get email configuration status
 */
exports.getEmailStatus = async (req, res) => {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    const isConfigured = !!(emailUser && emailPassword);

    res.json({
      success: true,
      data: {
        configured: isConfigured,
        emailUser: emailUser || 'Not configured',
        service: 'Gmail',
        status: isConfigured ? 'Ready' : 'Not configured'
      }
    });

  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email status',
      error: error.message
    });
  }
};
