const { validationResult } = require('express-validator');

/**
 * Validation Middleware for CQM System
 * Handles express-validator validation results
 */

/**
 * Validates request and returns errors if validation fails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Optional validation - doesn't stop execution if validation fails
 * Just logs the errors
 */
const optionalValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    req.validationWarnings = errors.array();
  }
  
  next();
};

/**
 * Sanitize common injection attacks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const sanitizeInput = (req, res, next) => {
  // Strip the most common script-injection vectors from string inputs.
  // This is defence-in-depth only — React escapes on render and Sequelize
  // parameterises queries; never rely on this as the sole XSS/SQLi control.
  const sanitizeString = (value) =>
    value
      // <script>, <iframe>, <object>, <embed> ... </tag> blocks
      .replace(/<\s*(script|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      // self-closing / unterminated dangerous tags
      .replace(/<\s*(script|iframe|object|embed)\b[^>]*>/gi, '')
      // javascript:/vbscript: URIs
      .replace(/(javascript|vbscript)\s*:/gi, '')
      // inline event handlers e.g. onerror= / onload=
      .replace(/\bon\w+\s*=/gi, '');

  // Recurse through nested objects/arrays — metadata, entries[], pdf_pages[]
  // were previously passed through untouched.
  const sanitizeValue = (value) => {
    if (typeof value === 'string') return sanitizeString(value);
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        value[key] = sanitizeValue(value[key]);
      }
      return value;
    }
    return value;
  };

  if (req.body) req.body = sanitizeValue(req.body);
  // req.query is mutated in place (it is a getter-backed object in some setups)
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      req.query[key] = sanitizeValue(req.query[key]);
    });
  }

  next();
};

module.exports = {
  validateRequest,
  validate: validateRequest, // Alias for backward compatibility
  optionalValidation,
  sanitizeInput
};
