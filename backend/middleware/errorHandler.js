const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class CQMComplianceError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'CQMComplianceError';
    this.category = 'compliance';
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Enhanced error logging with context
  const errorContext = {
    timestamp: new Date().toISOString(),
    message: err.message,
    name: err.name,
    statusCode: err.statusCode || 500,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user ? req.user.id : 'Anonymous',
    userAgent: req.get('user-agent'),
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    query: process.env.NODE_ENV === 'development' ? req.query : undefined
  };

  // Log based on error severity
  if (error.statusCode >= 500) {
    logger.error('CRITICAL ERROR:', errorContext);
  } else if (error.statusCode >= 400) {
    logger.warn('CLIENT ERROR:', errorContext);
  } else {
    logger.info('ERROR:', errorContext);
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(e => e.message).join(', ');
    error = new ValidationError(message);
    logger.warn('Validation Error:', { errors: err.errors, url: req.originalUrl });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    const message = `Duplicate value for ${field}. This value already exists.`;
    error = new ValidationError(message);
    logger.warn('Unique Constraint Violation:', { field, url: req.originalUrl });
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Invalid reference. The referenced resource does not exist.';
    error = new ValidationError(message);
    logger.warn('Foreign Key Constraint Violation:', { url: req.originalUrl });
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError') {
    const message = 'Database connection error. Please try again later.';
    error = new AppError(message, 503);
    logger.error('Database Connection Error:', { error: err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new AuthenticationError(message);
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large. Maximum size is 10MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files. Maximum is 10 files.';
    }
    error = new ValidationError(message);
    logger.warn('File Upload Error:', { code: err.code, url: req.originalUrl });
  }

  // Express-validator errors (should be caught by validation middleware)
  if (Array.isArray(err) && err[0]?.msg) {
    const message = err.map(e => e.msg).join(', ');
    error = new ValidationError(message);
  }

  // CQM-specific compliance errors
  if (err.category === 'compliance') {
    logger.error('CQM Compliance Error:', {
      message: err.message,
      facility: req.params.facilityId || req.body.facility_id,
      audit: req.params.auditId || req.body.audit_id,
      url: req.originalUrl
    });
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Only expose the raw message for operational/4xx errors. Unexpected 5xx errors
  // (raw Error / Sequelize errors) can leak table/column/constraint names, so in
  // production they collapse to a generic message.
  const exposeMessage = !isProd || error.isOperational === true || statusCode < 500;
  const response = {
    success: false,
    message: exposeMessage ? (error.message || 'Server Error') : 'Internal server error',
    errorType: error.name || 'Error',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = error;
  }

  // Add request ID if available
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
};

// Strips internal-detail fields from 5xx JSON responses in production.
// Many controllers return `res.status(500).json({ ..., error: error.message })`
// directly (bypassing the central errorHandler); this catches all of them by
// wrapping res.json once per request. No-op outside production.
const sanitizeErrorResponses = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object' && res.statusCode >= 500) {
      delete body.error;
      delete body.stack;
      delete body.details;
    }
    return originalJson(body);
  };
  next();
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route: ${req.originalUrl}`);
  logger.warn('404 Not Found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  next(error);
};

// Async error wrapper (eliminates need for try-catch in every controller)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  sanitizeErrorResponses,
  notFound,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  CQMComplianceError
};
