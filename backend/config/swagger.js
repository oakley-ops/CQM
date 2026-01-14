const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CQM Tracking System API',
      version: '1.0.0',
      description: 'Enterprise Card Quality Management (CQM) Tracking System API Documentation',
      contact: {
        name: 'CQM Support',
        email: 'support@cqm.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.cqm.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        // Manufacturing Facility Schema
        ManufacturingFacility: {
          type: 'object',
          required: ['facility_name', 'location', 'country_code', 'technology_type', 'contact_person_id'],
          properties: {
            id: { type: 'integer', description: 'Facility ID' },
            facility_name: { type: 'string', description: 'Name of the manufacturing facility' },
            location: { type: 'string', description: 'Physical location/address' },
            country_code: { type: 'string', minLength: 2, maxLength: 2, description: 'ISO 2-letter country code' },
            technology_type: { type: 'string', description: 'Card technology (Contact/Dual/Contactless)' },
            contact_person_id: { type: 'integer', description: 'ID of contact person' },
            certification_status: { 
              type: 'string', 
              enum: ['Pending', 'Certified', 'Suspended', 'Revoked'],
              description: 'Current certification status'
            },
            cqm_label: { type: 'string', description: 'CQM label in ACCLLTTTTS format' },
            last_audit_date: { type: 'string', format: 'date', description: 'Date of last audit' },
            next_audit_date: { type: 'string', format: 'date', description: 'Date of next scheduled audit' },
            certificate_expiry_date: { type: 'string', format: 'date', description: 'Certificate expiration date' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Test Definition Schema
        TestDefinition: {
          type: 'object',
          required: ['category_id', 'test_id', 'test_name', 'iso_standard', 'procedure', 'pass_criteria'],
          properties: {
            id: { type: 'integer', description: 'Test Definition ID' },
            category_id: { type: 'integer', description: 'Test Category ID' },
            test_id: { type: 'string', description: 'Unique test identifier' },
            test_name: { type: 'string', description: 'Test name' },
            iso_standard: { type: 'string', description: 'Applicable ISO standard' },
            procedure: { type: 'string', description: 'Test procedure description' },
            pass_criteria: { type: 'string', description: 'Criteria for passing the test' },
            expected_result: { type: 'string', description: 'Expected test result' },
            measurement_type: { 
              type: 'string', 
              enum: ['Numeric', 'Pass/Fail', 'Visual Inspection'],
              description: 'Type of measurement'
            },
            is_mandatory: { type: 'boolean', description: 'Is this test mandatory?' },
            is_cqm_required: { type: 'boolean', description: 'Required for CQM certification?' },
            is_destructive: { type: 'boolean', description: 'Is this a destructive test?' },
            risk_level: { 
              type: 'string', 
              enum: ['Low', 'Medium', 'High', 'Critical'],
              description: 'Risk level if test fails'
            },
            version: { type: 'string', description: 'Test definition version' },
            status: { 
              type: 'string', 
              enum: ['Active', 'Under Review', 'Superseded', 'Obsolete'],
              description: 'Test definition status'
            }
          }
        },
        
        // Test Result Schema
        TestResult: {
          type: 'object',
          required: ['facility_id', 'test_definition_id', 'batch_id', 'tester_id', 'result_status'],
          properties: {
            id: { type: 'integer', description: 'Test Result ID' },
            facility_id: { type: 'integer', description: 'Manufacturing Facility ID' },
            test_definition_id: { type: 'integer', description: 'Test Definition ID' },
            batch_id: { type: 'integer', description: 'Card Batch ID' },
            tester_id: { type: 'integer', description: 'ID of person who performed test' },
            actual_value: { type: 'string', description: 'Actual measured value' },
            result_status: { 
              type: 'string', 
              enum: ['Pass', 'Fail', 'Pending', 'Rework'],
              description: 'Test result status'
            },
            notes: { type: 'string', description: 'Additional notes' },
            evidence_url: { type: 'string', format: 'uri', description: 'URL to test evidence' },
            test_date: { type: 'string', format: 'date-time', description: 'When test was performed' }
          }
        },
        
        // Audit Schema
        Audit: {
          type: 'object',
          required: ['facility_id', 'audit_type', 'scheduled_date', 'auditor_id', 'scope'],
          properties: {
            id: { type: 'integer', description: 'Audit ID' },
            facility_id: { type: 'integer', description: 'Manufacturing Facility ID' },
            audit_type: { 
              type: 'string', 
              enum: ['Initial', 'Surveillance', 'Re-certification', 'Remote', 'On-site'],
              description: 'Type of audit'
            },
            scheduled_date: { type: 'string', format: 'date', description: 'Scheduled audit date' },
            auditor_id: { type: 'integer', description: 'ID of auditor' },
            audit_status: { 
              type: 'string', 
              enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
              description: 'Current audit status'
            },
            scope: { type: 'string', description: 'Audit scope description' },
            findings_summary: { type: 'string', description: 'Summary of audit findings' },
            report_url: { type: 'string', format: 'uri', description: 'URL to audit report' }
          }
        },
        
        // Non-Conformity Schema
        NonConformity: {
          type: 'object',
          required: ['facility_id', 'nc_type', 'severity', 'description', 'raised_by'],
          properties: {
            id: { type: 'integer', description: 'Non-Conformity ID' },
            facility_id: { type: 'integer', description: 'Manufacturing Facility ID' },
            nc_type: { 
              type: 'string', 
              enum: ['Major', 'Minor', 'Observation'],
              description: 'Type of non-conformity'
            },
            severity: { 
              type: 'string', 
              enum: ['Low', 'Medium', 'High', 'Critical'],
              description: 'Severity level'
            },
            description: { type: 'string', description: 'Description of non-conformity' },
            root_cause: { type: 'string', description: 'Root cause analysis' },
            corrective_action_plan: { type: 'string', description: 'Corrective action plan' },
            raised_by: { type: 'integer', description: 'ID of person who raised NC' },
            assigned_to: { type: 'integer', description: 'ID of person assigned to resolve' },
            status: { 
              type: 'string', 
              enum: ['Open', 'In Progress', 'Closed', 'Verified'],
              description: 'NC status'
            },
            due_date: { type: 'string', format: 'date', description: 'Due date for resolution' }
          }
        },
        
        // CAPA Action Schema
        CapaAction: {
          type: 'object',
          required: ['facility_id', 'problem_statement', 'root_cause', 'corrective_action_plan', 'assigned_to', 'due_date'],
          properties: {
            id: { type: 'integer', description: 'CAPA Action ID' },
            facility_id: { type: 'integer', description: 'Manufacturing Facility ID' },
            problem_statement: { type: 'string', description: 'Problem statement' },
            root_cause: { type: 'string', description: 'Root cause analysis' },
            corrective_action_plan: { type: 'string', description: 'Corrective action plan' },
            preventive_action_plan: { type: 'string', description: 'Preventive action plan' },
            assigned_to: { type: 'integer', description: 'ID of person assigned' },
            due_date: { type: 'string', format: 'date', description: 'Due date' },
            status: { 
              type: 'string', 
              enum: ['Open', 'In Progress', 'Pending Verification', 'Closed', 'Overdue'],
              description: 'CAPA status'
            },
            effectiveness_verification_date: { type: 'string', format: 'date', description: 'Date of effectiveness verification' }
          }
        },
        
        // Card Batch Schema
        CardBatch: {
          type: 'object',
          required: ['facility_id', 'batch_number', 'product_code', 'card_type', 'quantity_produced', 'production_date'],
          properties: {
            id: { type: 'integer', description: 'Card Batch ID' },
            facility_id: { type: 'integer', description: 'Manufacturing Facility ID' },
            batch_number: { type: 'string', description: 'Unique batch number' },
            product_code: { type: 'string', description: 'Product code' },
            card_type: { type: 'string', description: 'Type of card' },
            quantity_produced: { type: 'integer', description: 'Total quantity produced' },
            quantity_accepted: { type: 'integer', description: 'Quantity accepted' },
            quantity_rejected: { type: 'integer', description: 'Quantity rejected' },
            production_date: { type: 'string', format: 'date', description: 'Production date' },
            qc_status: { 
              type: 'string', 
              enum: ['Pending', 'Approved', 'Rejected', 'Quarantined'],
              description: 'Quality control status'
            }
          }
        },
        
        // Error Response Schema
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', description: 'Error message' },
            errors: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  value: { type: 'string' }
                }
              }
            }
          }
        },
        
        // Success Response Schema
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', description: 'Success message' },
            data: { type: 'object', description: 'Response data' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Manufacturing Facilities',
        description: 'Manufacturing facility management'
      },
      {
        name: 'Test Definitions',
        description: 'Test definition management'
      },
      {
        name: 'Test Results',
        description: 'Test result recording and analysis'
      },
      {
        name: 'Audits',
        description: 'Audit scheduling and management'
      },
      {
        name: 'Non-Conformities',
        description: 'Non-conformity tracking'
      },
      {
        name: 'CAPA Actions',
        description: 'Corrective and Preventive Actions'
      },
      {
        name: 'Card Batches',
        description: 'Card batch production tracking'
      }
    ]
  },
  apis: ['./routes/*.js', './controllers/*.js'] // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;



