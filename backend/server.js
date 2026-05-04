const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { syncModels } = require('./models');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');
const { authLimiter, exportLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');
const emailService = require('./utils/emailService');
const redisClient = require('./utils/redisClient');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/email');
const exportRoutes = require('./routes/export');
const excelExportRoutes = require('./routes/excelExport');
const dashboardRoutes = require('./routes/dashboard');

// Quality Test Entry routes
const testCategoryRoutes = require('./routes/testCategories');
const testSessionRoutes = require('./routes/testSessions');
const testEntryRoutes = require('./routes/testEntries');
const sampleCardRoutes = require('./routes/sampleCards');
const punchToolRoutes = require('./routes/punchTools');
const kappaRoutes = require('./routes/kappa');
const jobRoutes = require('./routes/jobs');

// Quote Tracker routes
const quoteRoutes = require('./routes/quotes');
const clientRoutes = require('./routes/clients');
const quoteMilestoneRoutes = require('./routes/quoteMilestones');

// Personal Task Management routes
const personalTaskRoutes = require('./routes/personalTasks');

// Desktop app launch routes
const launchRoutes = require('./routes/launch');

// Adhesion Log routes
const adhesionLogRoutes = require('./routes/adhesionLog');

// RAG Knowledge Base routes
const ragRoutes = require('./routes/rag');

// NEXUS Qualification Hub routes
const nexusRoutes = require('./routes/nexus');
const { startWatchdogScheduler } = require('./controllers/nexus/alertController');

// Autodata Pipeline routes
const autodataRoutes = require('./routes/autodata');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://192.168.0.100:3000',
  'http://qch',
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

// Rate limiting — generous for a local/internal app; auth routes stay strict below
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development', // no limit in dev
});
app.use('/api/', limiter);

// Strict rate limiter for auth routes (brute-force protection)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Rate limiter for export routes
app.use('/api/export', exportLimiter);
app.use('/api/excel-export', exportLimiter);

// Body parser — 15mb to accommodate base64 PDF page images from the OverlayPeel form
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Input sanitization
app.use(sanitizeInput);

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

// Swagger API Documentation — development only
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CQM API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

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

// Adhesion Log
app.use('/api/adhesion-log', adhesionLogRoutes);

// Quality Test Entry routes
app.use('/api/test-categories', testCategoryRoutes);
app.use('/api/test-sessions', testSessionRoutes);
app.use('/api/test-entries', testEntryRoutes);
app.use('/api/sample-cards', sampleCardRoutes);
app.use('/api/punch-tools', punchToolRoutes);
app.use('/api/kappa-studies', kappaRoutes);
app.use('/api/jobs', jobRoutes);

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
app.use('/api/launch', launchRoutes);

// RAG Knowledge Base routes
app.use('/api/rag', ragRoutes);

// NEXUS Qualification Hub routes
app.use('/api/nexus', nexusRoutes);

// Autodata Pipeline routes
app.use('/api/autodata', autodataRoutes);

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

    // Connect to Redis (optional — token blocklist degrades gracefully if unavailable)
    redisClient.connect();
    
    // Start listening
    const server = app.listen(PORT, () => {
      logger.info(`Card Quality Hub API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`API docs: http://localhost:${PORT}/api-docs`);
      }
      // Start NEXUS compliance watchdog
      startWatchdogScheduler();
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(
          `Port ${PORT} is already in use. ` +
          `Run: npx kill-port ${PORT}  OR  taskkill /F /IM node.exe (Windows) to free it.`
        );
        console.error(`\n❌  Port ${PORT} is already in use.\n` +
          `   Fix: open a new terminal and run:\n` +
          `         npx kill-port ${PORT}\n` +
          `   Then save any file to trigger nodemon restart.\n`);
      } else {
        logger.error('Server error:', err);
        console.error('❌ Server error:', err);
      }
      process.exit(1);
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
