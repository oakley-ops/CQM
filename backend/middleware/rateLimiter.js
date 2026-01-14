const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Role-Based Rate Limiting for CQM System
 * Different rate limits based on user roles and endpoint types
 */

/**
 * Create rate limiter with custom configuration
 */
const createRateLimiter = (options) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: null
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate Limit Exceeded:', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests. Please slow down.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * General API Rate Limiter
 * Applied to all /api/* routes
 */
const generalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests. Please try again in 15 minutes.'
});

/**
 * Role-Based Rate Limiter
 * Different limits based on user role
 */
const roleBasedLimiter = (req, res, next) => {
  if (!req.user) {
    // Anonymous users - very restrictive
    return createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: 'Please log in for higher rate limits.'
    })(req, res, next);
  }

  const role = req.user.role;

  // Define limits by role
  const roleLimits = {
    admin: {
      windowMs: 15 * 60 * 1000,
      max: 500, // Admins get highest limits
      message: 'Admin rate limit exceeded. Please try again later.'
    },
    quality_manager: {
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: 'Quality manager rate limit exceeded. Please try again later.'
    },
    auditor: {
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: 'Auditor rate limit exceeded. Please try again later.'
    },
    production_manager: {
      windowMs: 15 * 60 * 1000,
      max: 250,
      message: 'Production manager rate limit exceeded. Please try again later.'
    },
    tester: {
      windowMs: 15 * 60 * 1000,
      max: 150,
      message: 'Tester rate limit exceeded. Please try again later.'
    },
    viewer: {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Viewer rate limit exceeded. Please try again later.'
    }
  };

  const limits = roleLimits[role] || roleLimits.viewer;
  return createRateLimiter(limits)(req, res, next);
};

/**
 * Authentication Rate Limiter
 * Very strict to prevent brute force attacks
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 failed attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts. Please try again in 15 minutes.',
  handler: (req, res) => {
    logger.error('Auth Rate Limit Exceeded - Possible Brute Force Attack:', {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Your IP has been temporarily blocked for security.',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

/**
 * Test Result Recording Rate Limiter
 * Moderate limits for test data recording
 */
const testRecordingLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200, // 200 test results per 10 minutes
  message: 'Too many test results recorded. Please slow down.'
});

/**
 * Batch Operations Rate Limiter
 * For batch creation and updates
 */
const batchOperationsLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 batch operations per 10 minutes
  message: 'Too many batch operations. Please try again later.'
});

/**
 * Report Generation Rate Limiter
 * More lenient for report generation
 */
const reportGenerationLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 reports per 5 minutes
  message: 'Too many report generation requests. Please wait a moment.'
});

/**
 * Export Rate Limiter
 * Strict limits for data exports (security)
 */
const exportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Only 5 exports per 10 minutes
  message: 'Too many export requests. Please try again in 10 minutes.',
  handler: (req, res) => {
    logger.warn('Export Rate Limit Exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
      exportType: req.query.type || req.body.type
    });

    res.status(429).json({
      success: false,
      message: 'Too many data export requests. Please wait 10 minutes.',
      retryAfter: 600
    });
  }
});

/**
 * File Upload Rate Limiter
 * Strict limits for file uploads
 */
const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: 'Too many file uploads. Please try again later.'
});

/**
 * Audit Creation Rate Limiter
 * Moderate limits for audit scheduling
 */
const auditLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 audit operations per 10 minutes
  message: 'Too many audit operations. Please slow down.'
});

/**
 * Non-Conformity Logging Rate Limiter
 * Allows frequent NC logging but prevents spam
 */
const ncLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 NC operations per 10 minutes
  message: 'Too many non-conformity operations. Please slow down.'
});

/**
 * CAPA Actions Rate Limiter
 */
const capaLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 CAPA operations per 10 minutes
  message: 'Too many CAPA operations. Please slow down.'
});

/**
 * Facility Operations Rate Limiter
 * More restrictive for facility modifications
 */
const facilityLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 facility operations per 15 minutes
  message: 'Too many facility operations. Please slow down.'
});

/**
 * Search/Query Rate Limiter
 * For complex search operations
 */
const searchLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 searches per 5 minutes
  message: 'Too many search requests. Please slow down.'
});

/**
 * API Documentation Rate Limiter
 * Very lenient for documentation access
 */
const docsLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // 100 requests per 5 minutes
  message: 'Too many documentation requests.'
});

/**
 * Progressive Rate Limiting
 * Increases strictness for repeated violations
 */
const createProgressiveLimiter = () => {
  const violations = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    // Clean old violations (older than 1 hour)
    for (const [ip, data] of violations.entries()) {
      if (now - data.lastViolation > 60 * 60 * 1000) {
        violations.delete(ip);
      }
    }

    // Check violation history
    const violation = violations.get(key);
    if (violation) {
      violation.count++;
      violation.lastViolation = now;

      // Progressive penalties
      if (violation.count > 5) {
        return res.status(429).json({
          success: false,
          message: 'Multiple rate limit violations. Access temporarily restricted.',
          retryAfter: 3600
        });
      }
    } else {
      violations.set(key, { count: 1, lastViolation: now });
    }

    next();
  };
};

/**
 * IP Whitelist
 * Bypass rate limiting for trusted IPs
 */
const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];

const skipForTrustedIPs = (req) => {
  return trustedIPs.includes(req.ip);
};

/**
 * Rate Limit Configuration by Endpoint
 */
const rateLimitConfig = {
  '/api/auth/login': authLimiter,
  '/api/auth/register': authLimiter,
  '/api/test-results': testRecordingLimiter,
  '/api/card-batches': batchOperationsLimiter,
  '/api/audits': auditLimiter,
  '/api/non-conformities': ncLimiter,
  '/api/capa-actions': capaLimiter,
  '/api/facilities': facilityLimiter,
  '/api/export': exportLimiter,
  '/api/excel-export': exportLimiter,
  '/api/reports': reportGenerationLimiter,
  '/api-docs': docsLimiter
};

module.exports = {
  generalApiLimiter,
  roleBasedLimiter,
  authLimiter,
  testRecordingLimiter,
  batchOperationsLimiter,
  reportGenerationLimiter,
  exportLimiter,
  uploadLimiter,
  auditLimiter,
  ncLimiter,
  capaLimiter,
  facilityLimiter,
  searchLimiter,
  docsLimiter,
  createProgressiveLimiter,
  rateLimitConfig,
  skipForTrustedIPs
};



