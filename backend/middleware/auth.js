const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { User } = require('../models');
const { isTokenBlocked } = require('../utils/tokenBlocklist');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    try {
      // Verify token signature — pin the algorithm to prevent algorithm-confusion attacks
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      // Check token blocklist (Redis) — rejects tokens issued before user was deactivated
      if (await isTokenBlocked(decoded)) {
        return next(new AppError('Not authorized to access this route', 401));
      }

      // Get user from token
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!req.user) {
        return next(new AppError('User no longer exists', 401));
      }

      // Guard against deactivated accounts (DB-level fallback when Redis is unavailable)
      if (!req.user.is_active) {
        return next(new AppError('Account has been deactivated', 401));
      }

      next();
    } catch (error) {
      return next(new AppError('Not authorized to access this route', 401));
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { 
  protect, 
  authenticate: protect, // Alias for backward compatibility
  authorize 
};
