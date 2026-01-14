const logger = require('./logger');

/**
 * Audit Logger for CQM System
 * Tracks all critical CQM operations for compliance and traceability
 */

class AuditLogger {
  /**
   * Log facility-related operations
   */
  static facility(action, data, user) {
    const logEntry = {
      category: 'FACILITY',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      facilityId: data.facilityId || data.id,
      facilityName: data.facility_name || data.name,
      details: data,
      ipAddress: user?.ip
    };

    logger.info('AUDIT - Facility Operation:', logEntry);
    return logEntry;
  }

  /**
   * Log test-related operations
   */
  static test(action, data, user) {
    const logEntry = {
      category: 'TEST',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      testId: data.testId || data.test_definition_id,
      testName: data.test_name,
      batchId: data.batch_id,
      result: data.result_status,
      details: data,
      ipAddress: user?.ip
    };

    logger.info('AUDIT - Test Operation:', logEntry);
    return logEntry;
  }

  /**
   * Log audit-related operations
   */
  static audit(action, data, user) {
    const logEntry = {
      category: 'AUDIT',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      auditId: data.auditId || data.id,
      auditType: data.audit_type,
      facilityId: data.facility_id,
      auditorId: data.auditor_id,
      status: data.audit_status,
      details: data,
      ipAddress: user?.ip
    };

    logger.info('AUDIT - Audit Operation:', logEntry);
    return logEntry;
  }

  /**
   * Log non-conformity operations
   */
  static nonConformity(action, data, user) {
    const logEntry = {
      category: 'NON_CONFORMITY',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      ncId: data.ncId || data.id,
      ncType: data.nc_type,
      severity: data.severity,
      facilityId: data.facility_id,
      status: data.status,
      details: data,
      ipAddress: user?.ip
    };

    // Critical NCs require error-level logging
    if (data.nc_type === 'Major' || data.severity === 'Critical') {
      logger.error('AUDIT - CRITICAL Non-Conformity:', logEntry);
    } else {
      logger.warn('AUDIT - Non-Conformity:', logEntry);
    }

    return logEntry;
  }

  /**
   * Log CAPA actions
   */
  static capa(action, data, user) {
    const logEntry = {
      category: 'CAPA',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      capaId: data.capaId || data.id,
      facilityId: data.facility_id,
      assignedTo: data.assigned_to,
      status: data.status,
      dueDate: data.due_date,
      details: data,
      ipAddress: user?.ip
    };

    logger.info('AUDIT - CAPA Action:', logEntry);
    return logEntry;
  }

  /**
   * Log batch operations
   */
  static batch(action, data, user) {
    const logEntry = {
      category: 'BATCH',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      batchId: data.batchId || data.id,
      batchNumber: data.batch_number,
      productCode: data.product_code,
      quantityProduced: data.quantity_produced,
      qcStatus: data.qc_status,
      facilityId: data.facility_id,
      details: data,
      ipAddress: user?.ip
    };

    // Quarantine operations require warning-level logging
    if (action === 'QUARANTINE' || data.qc_status === 'Quarantined') {
      logger.warn('AUDIT - Batch Quarantine:', logEntry);
    } else {
      logger.info('AUDIT - Batch Operation:', logEntry);
    }

    return logEntry;
  }

  /**
   * Log certification operations
   */
  static certification(action, data, user) {
    const logEntry = {
      category: 'CERTIFICATION',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      facilityId: data.facility_id,
      certificationStatus: data.certification_status,
      cqmLabel: data.cqm_label,
      expiryDate: data.certificate_expiry_date,
      details: data,
      ipAddress: user?.ip
    };

    // Certification changes are critical
    logger.info('AUDIT - Certification Operation:', logEntry);
    return logEntry;
  }

  /**
   * Log authentication operations
   */
  static auth(action, data, user) {
    const logEntry = {
      category: 'AUTHENTICATION',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || data.userId,
      userName: user?.username || data.username,
      email: data.email,
      role: user?.role || data.role,
      ipAddress: user?.ip || data.ip,
      success: data.success !== false
    };

    if (data.success === false) {
      logger.warn('AUDIT - Auth Failure:', logEntry);
    } else {
      logger.info('AUDIT - Auth Operation:', logEntry);
    }

    return logEntry;
  }

  /**
   * Log data export operations
   */
  static export(action, data, user) {
    const logEntry = {
      category: 'DATA_EXPORT',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      exportType: data.exportType,
      resourceType: data.resourceType,
      recordCount: data.recordCount,
      format: data.format,
      details: data,
      ipAddress: user?.ip
    };

    logger.info('AUDIT - Data Export:', logEntry);
    return logEntry;
  }

  /**
   * Log compliance-related operations
   */
  static compliance(action, data, user) {
    const logEntry = {
      category: 'COMPLIANCE',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      complianceType: data.complianceType,
      standard: data.iso_standard || data.standard,
      status: data.compliance_status || data.status,
      facilityId: data.facility_id,
      details: data,
      ipAddress: user?.ip
    };

    logger.info('AUDIT - Compliance Operation:', logEntry);
    return logEntry;
  }

  /**
   * Log critical system events
   */
  static system(action, data, user) {
    const logEntry = {
      category: 'SYSTEM',
      action,
      timestamp: new Date().toISOString(),
      userId: user?.id || 'System',
      userName: user?.username || 'System',
      details: data,
      ipAddress: user?.ip
    };

    if (data.level === 'critical' || data.level === 'error') {
      logger.error('AUDIT - System Event:', logEntry);
    } else if (data.level === 'warning') {
      logger.warn('AUDIT - System Event:', logEntry);
    } else {
      logger.info('AUDIT - System Event:', logEntry);
    }

    return logEntry;
  }

  /**
   * Generate audit trail summary for a time period
   */
  static summary(startDate, endDate, category = null) {
    const summary = {
      period: {
        start: startDate,
        end: endDate
      },
      category: category || 'ALL',
      generatedAt: new Date().toISOString(),
      message: 'Audit trail summary generated'
    };

    logger.info('AUDIT - Trail Summary:', summary);
    return summary;
  }
}

/**
 * Middleware to automatically log API requests
 */
const auditMiddleware = (category) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Only log successful operations (200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          body: req.body,
          params: req.params,
          query: req.query
        };

        switch (category) {
          case 'facility':
            AuditLogger.facility(req.method, logData, req.user);
            break;
          case 'test':
            AuditLogger.test(req.method, logData, req.user);
            break;
          case 'audit':
            AuditLogger.audit(req.method, logData, req.user);
            break;
          case 'nonConformity':
            AuditLogger.nonConformity(req.method, logData, req.user);
            break;
          case 'capa':
            AuditLogger.capa(req.method, logData, req.user);
            break;
          case 'batch':
            AuditLogger.batch(req.method, logData, req.user);
            break;
          default:
            logger.info('API Request:', logData);
        }
      }

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  AuditLogger,
  auditMiddleware
};



