const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { syncModels } = require('./models');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const emailService = require('./utils/emailService');

// Import routes
const authRoutes = require('./routes/auth');
const stakeholderRoutes = require('./routes/stakeholders');
const lessonLearnedRoutes = require('./routes/lessonsLearned');
const budgetRoutes = require('./routes/budgets');
const expenseRoutes = require('./routes/expenses');
const evmRoutes = require('./routes/evm');
const inspectionRoutes = require('./routes/inspections');
const defectRoutes = require('./routes/defects');
const resourceRoutes = require('./routes/resources');
const communicationRoutes = require('./routes/communications');
const scopeRoutes = require('./routes/scope');
const reportRoutes = require('./routes/reports');
const emailRoutes = require('./routes/email');
const exportRoutes = require('./routes/export');
const excelExportRoutes = require('./routes/excelExport');
const dashboardRoutes = require('./routes/dashboard');

// CQM (Card Quality Management) routes
const testDefinitionRoutes = require('./routes/testDefinitions');
const facilityRoutes = require('./routes/facilities');
const testResultRoutes = require('./routes/testResults');
const auditRoutes = require('./routes/audits');
const nonConformityRoutes = require('./routes/nonConformities');
const capaActionRoutes = require('./routes/capaActions');
const cardBatchRoutes = require('./routes/cardBatches');

// Quote Tracker routes
const quoteRoutes = require('./routes/quotes');
const clientRoutes = require('./routes/clients');
const quoteMilestoneRoutes = require('./routes/quoteMilestones');

// Personal Task Management routes
const personalTaskRoutes = require('./routes/personalTasks');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  // Skip rate limiting for PDF export routes
  skip: (req) => {
    return req.path.includes('/pdf') || req.path.includes('/export');
  }
});
app.use('/api/', limiter);

// Separate rate limiter for PDF exports (more lenient)
const pdfLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 PDF exports per minute
  message: 'Too many PDF export requests. Please wait a moment and try again.'
});
app.use('/api/projects/:id/reports/*/pdf', pdfLimiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Swagger API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CQM API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CQM API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// CQM (Card Quality Management) Core Routes
app.use('/api/test-definitions', testDefinitionRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/test-results', testResultRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/non-conformities', nonConformityRoutes);
app.use('/api/capa-actions', capaActionRoutes);
app.use('/api/card-batches', cardBatchRoutes);

// Supporting Routes (may be adapted for CQM in future)
app.use('/api/stakeholders', stakeholderRoutes);
app.use('/api/lessons-learned', lessonLearnedRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/defects', defectRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/vendors', scopeRoutes);

// Reporting routes
app.use('/api', reportRoutes);

// Email routes
app.use('/api/email', emailRoutes);

// Export routes (Google Sheets)
app.use('/api/export', exportRoutes);

// Excel Export routes (No Google API - Direct Download)
app.use('/api/excel-export', excelExportRoutes);

// Quote Tracker routes
app.use('/api/quotes', quoteRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/quote-milestones', quoteMilestoneRoutes);

// Personal Task Management routes
app.use('/api/personal-tasks', personalTaskRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync models (only in development)
    await syncModels();
    
    // Initialize email service
    try {
      emailService.initialize();
      logger.info('Email service initialized');
    } catch (error) {
      logger.warn('Email service not configured:', error.message);
    }
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 CQM API Server Running                          ║
║                                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port: ${PORT}                                          ║
║   Database: Connected ✅                              ║
║                                                       ║
║   API Documentation: http://localhost:${PORT}/api-docs   ║
║   Health Check: http://localhost:${PORT}/health          ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
      
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('Server startup error:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  logger.error('Unhandled rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

module.exports = app;
