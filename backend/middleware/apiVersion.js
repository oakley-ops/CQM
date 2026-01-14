/**
 * API Versioning Middleware
 * Supports versioning through URL path or Accept header
 */

const logger = require('../utils/logger');

/**
 * API Version Configuration
 */
const API_VERSIONS = {
  v1: '1.0.0',
  v2: '2.0.0' // Future version
};

const CURRENT_VERSION = 'v1';
const SUPPORTED_VERSIONS = ['v1'];
const DEPRECATED_VERSIONS = [];

/**
 * Extract API version from request
 * Supports both URL path (/api/v1/...) and Accept header
 */
const extractVersion = (req) => {
  // Method 1: Extract from URL path
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Method 2: Extract from Accept header
  // Example: Accept: application/vnd.cqm.v1+json
  const acceptHeader = req.get('Accept');
  if (acceptHeader) {
    const headerMatch = acceptHeader.match(/application\/vnd\.cqm\.(v\d+)\+json/);
    if (headerMatch) {
      return headerMatch[1];
    }
  }

  // Method 3: Extract from custom header
  const versionHeader = req.get('API-Version');
  if (versionHeader) {
    return versionHeader.startsWith('v') ? versionHeader : `v${versionHeader}`;
  }

  // Default to current version
  return CURRENT_VERSION;
};

/**
 * Validate API version
 */
const validateVersion = (version) => {
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return {
      valid: false,
      message: `API version '${version}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`
    };
  }

  if (DEPRECATED_VERSIONS.includes(version)) {
    return {
      valid: true,
      deprecated: true,
      message: `API version '${version}' is deprecated. Please migrate to ${CURRENT_VERSION}`
    };
  }

  return { valid: true, deprecated: false };
};

/**
 * API Versioning Middleware
 */
const apiVersionMiddleware = (req, res, next) => {
  // Extract version
  const version = extractVersion(req);
  req.apiVersion = version;

  // Validate version
  const validation = validateVersion(version);

  if (!validation.valid) {
    logger.warn('Invalid API Version Request:', {
      requestedVersion: version,
      path: req.path,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      message: validation.message,
      supportedVersions: SUPPORTED_VERSIONS,
      currentVersion: CURRENT_VERSION
    });
  }

  // Log deprecation warning
  if (validation.deprecated) {
    logger.warn('Deprecated API Version Used:', {
      version,
      path: req.path,
      ip: req.ip,
      userId: req.user?.id
    });

    // Add deprecation header
    res.set('Warning', `299 - "${validation.message}"`);
    res.set('Sunset', 'Sat, 31 Dec 2024 23:59:59 GMT'); // Deprecation deadline
  }

  // Add version info to response headers
  res.set('API-Version', version);
  res.set('API-Current-Version', CURRENT_VERSION);

  next();
};

/**
 * Version-specific routing helper
 * Routes requests to version-specific handlers
 */
const versionRoute = (versions) => {
  return (req, res, next) => {
    const version = req.apiVersion || CURRENT_VERSION;
    const handler = versions[version] || versions[CURRENT_VERSION];

    if (!handler) {
      return res.status(501).json({
        success: false,
        message: `This endpoint is not implemented for API version ${version}`,
        currentVersion: CURRENT_VERSION
      });
    }

    handler(req, res, next);
  };
};

/**
 * Feature flag based on API version
 */
const isFeatureAvailable = (feature, version) => {
  const featureVersions = {
    // v1 features
    'basic_cqm': ['v1', 'v2'],
    'test_management': ['v1', 'v2'],
    'audit_management': ['v1', 'v2'],
    
    // v2 features (future)
    'advanced_analytics': ['v2'],
    'ai_predictions': ['v2'],
    'blockchain_traceability': ['v2']
  };

  return featureVersions[feature]?.includes(version) || false;
};

/**
 * API Response Wrapper with Version Info
 */
const versionedResponse = (req, res, data) => {
  const response = {
    success: true,
    apiVersion: req.apiVersion || CURRENT_VERSION,
    data: data
  };

  // Add timestamp
  response.timestamp = new Date().toISOString();

  // Add deprecation notice if applicable
  if (DEPRECATED_VERSIONS.includes(req.apiVersion)) {
    response.deprecation = {
      message: `This API version will be deprecated on 2024-12-31`,
      migrateToVersion: CURRENT_VERSION,
      migrationGuide: `/docs/migration/${req.apiVersion}-to-${CURRENT_VERSION}`
    };
  }

  return res.json(response);
};

/**
 * Version Comparison Utility
 */
const compareVersions = (v1, v2) => {
  const v1Parts = v1.replace('v', '').split('.').map(Number);
  const v2Parts = v2.replace('v', '').split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
};

/**
 * Middleware to require minimum API version
 */
const requireVersion = (minVersion) => {
  return (req, res, next) => {
    const currentVersion = req.apiVersion || CURRENT_VERSION;

    if (compareVersions(currentVersion, minVersion) < 0) {
      return res.status(426).json({
        success: false,
        message: `This endpoint requires API version ${minVersion} or higher`,
        currentRequestVersion: currentVersion,
        requiredVersion: minVersion,
        upgradeGuide: `/docs/upgrade-to-${minVersion}`
      });
    }

    next();
  };
};

/**
 * Get API Version Info
 */
const getVersionInfo = (req, res) => {
  res.json({
    success: true,
    currentVersion: CURRENT_VERSION,
    supportedVersions: SUPPORTED_VERSIONS,
    deprecatedVersions: DEPRECATED_VERSIONS,
    versions: {
      v1: {
        version: API_VERSIONS.v1,
        releaseDate: '2024-01-01',
        status: 'stable',
        documentation: '/api-docs',
        features: [
          'Manufacturing Facility Management',
          'Test Definition & Results',
          'Audit Management',
          'Non-Conformity Tracking',
          'CAPA Actions',
          'Card Batch Management'
        ]
      },
      v2: {
        version: API_VERSIONS.v2,
        releaseDate: 'TBD',
        status: 'planned',
        features: [
          'All v1 features',
          'Advanced Analytics & Reporting',
          'AI-powered Predictions',
          'Blockchain Traceability',
          'Real-time Collaboration',
          'Mobile SDK'
        ]
      }
    },
    migration: {
      v1ToV2: {
        breakingChanges: [],
        newFeatures: [],
        guide: '/docs/migration/v1-to-v2'
      }
    }
  });
};

/**
 * Middleware to log API version usage
 */
const logVersionUsage = (req, res, next) => {
  const version = req.apiVersion || CURRENT_VERSION;

  // Only log in production for analytics
  if (process.env.NODE_ENV === 'production') {
    logger.info('API Version Usage:', {
      version,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      ip: req.ip
    });
  }

  next();
};

module.exports = {
  apiVersionMiddleware,
  versionRoute,
  isFeatureAvailable,
  versionedResponse,
  compareVersions,
  requireVersion,
  getVersionInfo,
  logVersionUsage,
  API_VERSIONS,
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEPRECATED_VERSIONS
};



