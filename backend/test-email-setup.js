/**
 * Email Setup Test Script
 * 
 * This script helps you verify your email configuration is working correctly.
 * Run this after configuring your Gmail App Password in .env
 * 
 * Usage: node test-email-setup.js
 */

require('dotenv').config();
const emailService = require('./utils/emailService');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

async function testEmailSetup() {
  console.log('\n' + '='.repeat(60));
  log.section('📧 Email Configuration Test');
  console.log('='.repeat(60));

  // Step 1: Check environment variables
  log.section('Step 1: Checking Environment Variables');
  
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser) {
    log.error('EMAIL_USER is not configured in .env');
    log.info('Please add: EMAIL_USER=service@gmail.com');
    process.exit(1);
  } else {
    log.success(`EMAIL_USER: ${emailUser}`);
  }

  if (!emailPassword) {
    log.error('EMAIL_PASSWORD is not configured in .env');
    log.info('Please add your Gmail App Password');
    log.info('Generate at: https://myaccount.google.com/apppasswords');
    process.exit(1);
  } else {
    log.success(`EMAIL_PASSWORD: ${'*'.repeat(emailPassword.length)} (configured)`);
  }

  // Step 2: Initialize email service
  log.section('Step 2: Initializing Email Service');
  
  try {
    emailService.initialize();
    log.success('Email service initialized successfully');
  } catch (error) {
    log.error(`Failed to initialize email service: ${error.message}`);
    process.exit(1);
  }

  // Step 3: Verify connection
  log.section('Step 3: Verifying SMTP Connection');
  
  try {
    await emailService.verifyConnection();
    log.success('SMTP connection verified successfully');
    log.success('Gmail authentication successful');
  } catch (error) {
    log.error(`SMTP verification failed: ${error.message}`);
    log.warning('Common issues:');
    log.info('  1. Make sure you are using a Gmail App Password, not your regular password');
    log.info('  2. Enable 2-Step Verification on your Google account');
    log.info('  3. Generate a new App Password at: https://myaccount.google.com/apppasswords');
    log.info('  4. Remove any spaces from the App Password');
    process.exit(1);
  }

  // Step 4: Send test email (optional)
  log.section('Step 4: Test Email (Optional)');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Would you like to send a test email? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      readline.question('Enter recipient email address: ', async (recipient) => {
        if (!recipient || !recipient.includes('@')) {
          log.error('Invalid email address');
          readline.close();
          process.exit(1);
        }

        log.info(`Sending test email to ${recipient}...`);

        try {
          const result = await emailService.sendEmail({
            to: recipient,
            subject: 'Test Email from PMBOK System',
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0;">✅ Email Test Successful!</h1>
                </div>
                <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #1e40af;">Congratulations!</h2>
                  <p style="font-size: 16px; line-height: 1.6;">
                    Your PMBOK email service is configured correctly and working perfectly.
                  </p>
                  <div style="background-color: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #10b981;">✓ Configuration Verified</h3>
                    <ul style="line-height: 1.8;">
                      <li>Gmail SMTP connection: <strong>Working</strong></li>
                      <li>Email service: <strong>Initialized</strong></li>
                      <li>Authentication: <strong>Successful</strong></li>
                      <li>Email delivery: <strong>Confirmed</strong></li>
                    </ul>
                  </div>
                  <p style="font-size: 14px; color: #6b7280;">
                    <strong>Test Details:</strong><br>
                    Sent: ${new Date().toLocaleString()}<br>
                    From: ${emailUser}<br>
                    To: ${recipient}
                  </p>
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px;">
                      This is an automated test message from PMBOK Project Management System
                    </p>
                  </div>
                </div>
              </div>
            `
          });

          log.success('Test email sent successfully!');
          log.success(`Message ID: ${result.messageId}`);
          log.info(`Check ${recipient} inbox (and spam folder)`);
          
        } catch (error) {
          log.error(`Failed to send test email: ${error.message}`);
        }

        readline.close();
        displaySummary();
      });
    } else {
      readline.close();
      displaySummary();
    }
  });
}

function displaySummary() {
  log.section('📋 Summary');
  
  console.log('Email service is ready to use!');
  console.log('');
  console.log('Available API endpoints:');
  console.log('  • GET  /api/email/status');
  console.log('  • POST /api/email/verify');
  console.log('  • POST /api/email/test');
  console.log('  • POST /api/email/send');
  console.log('  • POST /api/email/reports/:id/executive');
  console.log('  • POST /api/email/reports/:id/status');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Start your backend server: npm run dev');
  console.log('  2. Test the API endpoints');
  console.log('  3. Integrate the EmailReportDialog component in your frontend');
  console.log('  4. Send your first executive dashboard!');
  console.log('');
  console.log('Documentation:');
  console.log('  • EMAIL_SETUP_GUIDE.md - Complete setup instructions');
  console.log('  • EMAIL_API_REFERENCE.md - API documentation');
  console.log('  • INTEGRATION_EXAMPLE.md - Frontend integration examples');
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

// Run the test
testEmailSetup().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
