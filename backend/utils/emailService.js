const nodemailer = require('nodemailer');

/**
 * Email Service for sending reports and notifications
 * Configured for Gmail SMTP
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize the email transporter with Gmail configuration
   */
  initialize() {
    if (this.initialized) return;

    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      console.warn('Email credentials not configured. Email service will not be available.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });

    this.initialized = true;
    console.log('Email service initialized successfully');
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      console.error('Email verification failed:', error);
      throw new Error('Email service verification failed: ' + error.message);
    }
  }

  /**
   * Send a plain text or HTML email
   */
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    if (!this.transporter) {
      throw new Error('Email service not initialized. Please configure EMAIL_USER and EMAIL_PASSWORD in .env');
    }

    try {
      const mailOptions = {
        from: `"CQM Tracking System" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html: html || text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject
      });

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email: ' + error.message);
    }
  }

  /**
   * Send Executive Dashboard Report
   */
  async sendExecutiveDashboard({ to, projectName, dashboardData, reportUrl }) {
    const subject = `Executive Dashboard - ${projectName}`;
    
    const html = this.generateExecutiveDashboardHTML(projectName, dashboardData, reportUrl);
    
    return await this.sendEmail({
      to,
      subject,
      html
    });
  }

  /**
   * Send Status Report
   */
  async sendStatusReport({ to, projectName, period, reportData, reportUrl }) {
    const subject = `${period} Status Report - ${projectName}`;
    
    const html = this.generateStatusReportHTML(projectName, period, reportData, reportUrl);
    
    return await this.sendEmail({
      to,
      subject,
      html
    });
  }

  /**
   * Send Custom Report with attachments
   */
  async sendCustomReport({ to, subject, message, attachments = [] }) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CQM Tracking System</h1>
          </div>
          <div class="content">
            ${message}
          </div>
          <div class="footer">
            <p>This is an automated message from CQM Tracking System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject,
      html,
      attachments
    });
  }

  /**
   * Generate HTML for Executive Dashboard
   */
  generateExecutiveDashboardHTML(projectName, data, reportUrl) {
    const statusColor = data.overallStatus?.color || 'gray';
    const budgetColor = data.budget?.color || 'gray';
    const scheduleColor = data.schedule?.color || 'gray';
    const qualityColor = data.quality?.color || 'gray';
    const riskColor = data.risks?.color || 'gray';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { background-color: #1e40af; color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 10px 0 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 20px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; margin: 10px 0; }
          .status-green { background-color: #10b981; }
          .status-yellow { background-color: #f59e0b; }
          .status-red { background-color: #ef4444; }
          .status-gray { background-color: #6b7280; }
          .metrics { display: table; width: 100%; margin: 20px 0; }
          .metric-row { display: table-row; }
          .metric-cell { display: table-cell; padding: 15px; border-bottom: 1px solid #e5e7eb; }
          .metric-label { font-weight: bold; color: #6b7280; font-size: 14px; }
          .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .section { margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; }
          .section-title { font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #1e40af; }
          .list-item { padding: 10px; margin: 5px 0; background-color: white; border-left: 4px solid #2563eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background-color: #f3f4f6; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Executive Dashboard</h1>
            <p>${projectName}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <h2>Overall Project Status</h2>
              <span class="status-badge status-${statusColor}">
                ${data.overallStatus?.label || 'UNKNOWN'}
              </span>
            </div>

            <div class="section">
              <div class="section-title">📊 Key Metrics</div>
              
              <div class="metrics">
                <div class="metric-row">
                  <div class="metric-cell">
                    <div class="metric-label">Budget Status</div>
                    <div class="metric-value" style="color: ${budgetColor === 'green' ? '#10b981' : budgetColor === 'yellow' ? '#f59e0b' : '#ef4444'}">
                      ${data.budget?.variancePercent || 0}%
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                      $${data.budget?.actual || 0} / $${data.budget?.planned || 0}
                    </div>
                  </div>
                  <div class="metric-cell">
                    <div class="metric-label">Schedule Progress</div>
                    <div class="metric-value" style="color: ${scheduleColor === 'green' ? '#10b981' : scheduleColor === 'yellow' ? '#f59e0b' : '#ef4444'}">
                      ${data.schedule?.progress || 0}%
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                      ${data.schedule?.completedTasks || 0} / ${data.schedule?.totalTasks || 0} tasks
                    </div>
                  </div>
                </div>
                
                <div class="metric-row">
                  <div class="metric-cell">
                    <div class="metric-label">Quality Pass Rate</div>
                    <div class="metric-value" style="color: ${qualityColor === 'green' ? '#10b981' : qualityColor === 'yellow' ? '#f59e0b' : '#ef4444'}">
                      ${data.quality?.passRate || 0}%
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                      ${data.quality?.openDefects || 0} open defects
                    </div>
                  </div>
                  <div class="metric-cell">
                    <div class="metric-label">Active Risks</div>
                    <div class="metric-value" style="color: ${riskColor === 'green' ? '#10b981' : riskColor === 'yellow' ? '#f59e0b' : '#ef4444'}">
                      ${data.risks?.active || 0}
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                      ${data.risks?.critical || 0} critical
                    </div>
                  </div>
                </div>
              </div>
            </div>

            ${data.activeIssues && data.activeIssues.length > 0 ? `
            <div class="section">
              <div class="section-title">⚠️ Active Issues</div>
              ${data.activeIssues.slice(0, 5).map(issue => `
                <div class="list-item">
                  <strong>${issue.type.toUpperCase()}</strong>: ${issue.title || issue.name || 'Untitled'}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${data.milestones?.upcoming && data.milestones.upcoming.length > 0 ? `
            <div class="section">
              <div class="section-title">🎯 Upcoming Milestones</div>
              ${data.milestones.upcoming.map(milestone => `
                <div class="list-item">
                  <strong>${milestone.name}</strong> - Due: ${new Date(milestone.dueDate).toLocaleDateString()}
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${reportUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reportUrl}" class="button">View Full Dashboard</a>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>This is an automated report from CQM Tracking System</p>
            <p>© ${new Date().getFullYear()} CQM Tracking System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for Status Report
   */
  generateStatusReportHTML(projectName, period, data, reportUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { background-color: #1e40af; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 20px; }
          .section { margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1e40af; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; background-color: #f3f4f6; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${period} Status Report</h1>
            <p>${projectName}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">📋 Report Summary</div>
              <p>This ${period.toLowerCase()} status report provides an overview of project progress, accomplishments, and upcoming activities.</p>
            </div>

            ${reportUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reportUrl}" class="button">View Full Report</a>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>This is an automated report from CQM Tracking System</p>
            <p>© ${new Date().getFullYear()} CQM Tracking System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
