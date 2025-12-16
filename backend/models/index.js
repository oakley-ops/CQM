const { sequelize } = require('../config/database');
const User = require('./User');

// ==========================================
// Core CQM Models
// ==========================================
const ManufacturingFacility = require('./ManufacturingFacility');
const Project = ManufacturingFacility; // Backward compatibility alias

const TestResult = require('./TestResult');
const Task = TestResult; // Backward compatibility alias

const Audit = require('./Audit');
const Milestone = Audit; // Backward compatibility alias

const NonConformity = require('./NonConformity');
const Risk = NonConformity; // Backward compatibility alias

const CapaAction = require('./CapaAction');
const ChangeRequest = CapaAction; // Backward compatibility alias

const QmsDocument = require('./QmsDocument');
const ProjectDocument = QmsDocument; // Backward compatibility alias

const ISOComplianceRecord = require('./ISOComplianceRecord');
const QualityMetric = ISOComplianceRecord; // Backward compatibility alias

// ==========================================
// Supporting Models
// ==========================================
const ProjectCharter = require('./ProjectCharter');
const Stakeholder = require('./Stakeholder');
const LessonLearned = require('./LessonLearned');
const TaskDependency = require('./TaskDependency');
const Budget = require('./Budget');
const Expense = require('./Expense');
const EVMSnapshot = require('./EVMSnapshot');
const QualityInspection = require('./QualityInspection');
const Defect = require('./Defect');
const TeamMember = require('./TeamMember');
const ResourceAllocation = require('./ResourceAllocation');
const StatusReport = require('./StatusReport');
const MeetingMinute = require('./MeetingMinute');
const CommunicationLog = require('./CommunicationLog');
const Requirement = require('./Requirement');
const WBSItem = require('./WBSItem');
const Vendor = require('./Vendor');
const Contract = require('./Contract');

// Quote Tracker Models
const Client = require('./Client');
const Quote = require('./Quote');
const QuoteMilestone = require('./QuoteMilestone');
const QuoteMilestoneTracking = require('./QuoteMilestoneTracking');
const QuoteAction = require('./QuoteAction');
const QuoteDocument = require('./QuoteDocument');
const QuoteActivityLog = require('./QuoteActivityLog');

// Personal Task Management
const PersonalTask = require('./PersonalTask');

// Define associations

// User - Project
User.hasMany(Project, {
  foreignKey: 'project_manager_id',
  as: 'managedProjects'
});

Project.belongsTo(User, {
  foreignKey: 'project_manager_id',
  as: 'projectManager'
});

// Project - ProjectCharter (One-to-One)
Project.hasOne(ProjectCharter, {
  foreignKey: 'project_id',
  as: 'charter'
});

ProjectCharter.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Project - Stakeholders (One-to-Many)
Project.hasMany(Stakeholder, {
  foreignKey: 'project_id',
  as: 'stakeholders'
});

Stakeholder.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Project - CapaActions (One-to-Many)
Project.hasMany(CapaAction, {
  foreignKey: 'facility_id',
  as: 'capaActions'
});

CapaAction.belongsTo(Project, {
  foreignKey: 'facility_id',
  as: 'facility'
});

// User - CapaAction (raised_by)
User.hasMany(CapaAction, {
  foreignKey: 'raised_by',
  as: 'raisedCapas'
});

CapaAction.belongsTo(User, {
  foreignKey: 'raised_by',
  as: 'raiser'
});

// User - CapaAction (assigned_to)
User.hasMany(CapaAction, {
  foreignKey: 'assigned_to',
  as: 'assignedCapas'
});

CapaAction.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});

// NonConformity - CapaActions (One-to-Many)
NonConformity.hasMany(CapaAction, {
  foreignKey: 'nc_id',
  as: 'capaActions'
});

CapaAction.belongsTo(NonConformity, {
  foreignKey: 'nc_id',
  as: 'nonConformity'
});

// Audit - CapaActions (One-to-Many)
Audit.hasMany(CapaAction, {
  foreignKey: 'audit_id',
  as: 'capaActions'
});

CapaAction.belongsTo(Audit, {
  foreignKey: 'audit_id',
  as: 'audit'
});

// Project - LessonsLearned (One-to-Many)
Project.hasMany(LessonLearned, {
  foreignKey: 'project_id',
  as: 'lessonsLearned'
});

LessonLearned.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// User - LessonLearned (documented_by)
User.hasMany(LessonLearned, {
  foreignKey: 'documented_by',
  as: 'documentedLessons'
});

LessonLearned.belongsTo(User, {
  foreignKey: 'documented_by',
  as: 'documenter'
});

// Project - Tasks (One-to-Many)
Project.hasMany(Task, {
  foreignKey: 'project_id',
  as: 'tasks'
});

Task.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// User - Task (assigned_to)
User.hasMany(Task, {
  foreignKey: 'assigned_to',
  as: 'assignedTasks'
});

Task.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});

// Task - Task (parent-child)
Task.hasMany(Task, {
  foreignKey: 'parent_task_id',
  as: 'subtasks'
});

Task.belongsTo(Task, {
  foreignKey: 'parent_task_id',
  as: 'parentTask'
});

// Task Dependencies
Task.belongsToMany(Task, {
  through: TaskDependency,
  as: 'dependencies',
  foreignKey: 'task_id',
  otherKey: 'depends_on_task_id'
});

// Project - Milestones (One-to-Many)
Project.hasMany(Milestone, {
  foreignKey: 'project_id',
  as: 'milestones'
});

Milestone.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Project - Budgets (One-to-Many)
Project.hasMany(Budget, {
  foreignKey: 'project_id',
  as: 'budgets'
});

Budget.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Project - Expenses (One-to-Many)
Project.hasMany(Expense, {
  foreignKey: 'project_id',
  as: 'expenses'
});

Expense.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Budget - Expenses (One-to-Many)
Budget.hasMany(Expense, {
  foreignKey: 'budget_id',
  as: 'expenses'
});

Expense.belongsTo(Budget, {
  foreignKey: 'budget_id',
  as: 'budget'
});

// Project - EVM Snapshots (One-to-Many)
Project.hasMany(EVMSnapshot, {
  foreignKey: 'project_id',
  as: 'evmSnapshots'
});

EVMSnapshot.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Project - ISO Compliance Records (One-to-Many)
Project.hasMany(ISOComplianceRecord, {
  foreignKey: 'facility_id',
  as: 'isoComplianceRecords'
});

ISOComplianceRecord.belongsTo(Project, {
  foreignKey: 'facility_id',
  as: 'facility'
});

// Audit - ISO Compliance Records (One-to-Many)
Audit.hasMany(ISOComplianceRecord, {
  foreignKey: 'audit_id',
  as: 'complianceRecords'
});

ISOComplianceRecord.belongsTo(Audit, {
  foreignKey: 'audit_id',
  as: 'audit'
});

// NonConformity - ISO Compliance Records (One-to-Many)
NonConformity.hasMany(ISOComplianceRecord, {
  foreignKey: 'nc_id',
  as: 'complianceRecords'
});

ISOComplianceRecord.belongsTo(NonConformity, {
  foreignKey: 'nc_id',
  as: 'nonConformity'
});

// CapaAction - ISO Compliance Records (One-to-Many)
CapaAction.hasMany(ISOComplianceRecord, {
  foreignKey: 'capa_id',
  as: 'complianceRecords'
});

ISOComplianceRecord.belongsTo(CapaAction, {
  foreignKey: 'capa_id',
  as: 'capaAction'
});

// Project - Quality Inspections (One-to-Many)
Project.hasMany(QualityInspection, {
  foreignKey: 'project_id',
  as: 'qualityInspections'
});

QualityInspection.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// Project - Defects (One-to-Many)
Project.hasMany(Defect, {
  foreignKey: 'project_id',
  as: 'defects'
});

Defect.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// User - Quality Inspection (inspector)
User.hasMany(QualityInspection, {
  foreignKey: 'inspector_id',
  as: 'inspections'
});

QualityInspection.belongsTo(User, {
  foreignKey: 'inspector_id',
  as: 'inspector'
});

// Quality Inspection - Defects (One-to-Many)
QualityInspection.hasMany(Defect, {
  foreignKey: 'inspection_id',
  as: 'defects'
});

Defect.belongsTo(QualityInspection, {
  foreignKey: 'inspection_id',
  as: 'inspection'
});

// User - Defect (detected_by)
User.hasMany(Defect, {
  foreignKey: 'detected_by',
  as: 'detectedDefects'
});

Defect.belongsTo(User, {
  foreignKey: 'detected_by',
  as: 'detectedBy'
});

// User - Defect (assigned_to)
User.hasMany(Defect, {
  foreignKey: 'assigned_to',
  as: 'assignedDefects'
});

Defect.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignedTo'
});

// Project - Risks (One-to-Many)
Project.hasMany(Risk, {
  foreignKey: 'project_id',
  as: 'risks'
});

Risk.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

// User - Risk (owner)
User.hasMany(Risk, {
  foreignKey: 'owner_id',
  as: 'ownedRisks'
});

Risk.belongsTo(User, {
  foreignKey: 'owner_id',
  as: 'owner'
});

// Phase 7: Resource Management associations
Project.hasMany(TeamMember, {
  foreignKey: 'project_id',
  as: 'teamMembers'
});

TeamMember.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

User.hasMany(TeamMember, {
  foreignKey: 'user_id',
  as: 'teamMemberships'
});

TeamMember.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Project.hasMany(ResourceAllocation, {
  foreignKey: 'project_id',
  as: 'resourceAllocations'
});

ResourceAllocation.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

TeamMember.hasMany(ResourceAllocation, {
  foreignKey: 'team_member_id',
  as: 'allocations'
});

ResourceAllocation.belongsTo(TeamMember, {
  foreignKey: 'team_member_id',
  as: 'teamMember'
});

Task.hasMany(ResourceAllocation, {
  foreignKey: 'task_id',
  as: 'resourceAllocations'
});

ResourceAllocation.belongsTo(Task, {
  foreignKey: 'task_id',
  as: 'task'
});

// Phase 8: Communications Management associations
Project.hasMany(StatusReport, {
  foreignKey: 'project_id',
  as: 'statusReports'
});

StatusReport.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

User.hasMany(StatusReport, {
  foreignKey: 'created_by',
  as: 'createdReports'
});

StatusReport.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

Project.hasMany(MeetingMinute, {
  foreignKey: 'project_id',
  as: 'meetingMinutes'
});

MeetingMinute.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

User.hasMany(MeetingMinute, {
  foreignKey: 'created_by',
  as: 'createdMinutes'
});

MeetingMinute.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

Project.hasMany(CommunicationLog, {
  foreignKey: 'project_id',
  as: 'communications'
});

CommunicationLog.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

User.hasMany(CommunicationLog, {
  foreignKey: 'sender_id',
  as: 'sentCommunications'
});

CommunicationLog.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender'
});

// Phase 9: Scope & Procurement associations
Project.hasMany(Requirement, {
  foreignKey: 'project_id',
  as: 'requirements'
});

Requirement.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

Project.hasMany(WBSItem, {
  foreignKey: 'project_id',
  as: 'wbsItems'
});

WBSItem.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

WBSItem.hasMany(WBSItem, {
  foreignKey: 'parent_id',
  as: 'children'
});

WBSItem.belongsTo(WBSItem, {
  foreignKey: 'parent_id',
  as: 'parent'
});

Project.hasMany(Contract, {
  foreignKey: 'project_id',
  as: 'contracts'
});

Contract.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

Vendor.hasMany(Contract, {
  foreignKey: 'vendor_id',
  as: 'contracts'
});

Contract.belongsTo(Vendor, {
  foreignKey: 'vendor_id',
  as: 'vendor'
});

// QMS Documents associations
Project.hasMany(QmsDocument, {
  foreignKey: 'facility_id',
  as: 'qmsDocuments'
});

QmsDocument.belongsTo(Project, {
  foreignKey: 'facility_id',
  as: 'facility'
});

User.hasMany(QmsDocument, {
  foreignKey: 'uploaded_by',
  as: 'uploadedDocuments'
});

QmsDocument.belongsTo(User, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});

// Document versioning (self-referential)
QmsDocument.hasMany(QmsDocument, {
  foreignKey: 'parent_document_id',
  as: 'versions'
});

QmsDocument.belongsTo(QmsDocument, {
  foreignKey: 'parent_document_id',
  as: 'parentDocument'
});

// Audit - QMS Documents (One-to-Many)
Audit.hasMany(QmsDocument, {
  foreignKey: 'related_audit_id',
  as: 'auditDocuments'
});

QmsDocument.belongsTo(Audit, {
  foreignKey: 'related_audit_id',
  as: 'relatedAudit'
});

// NonConformity - QMS Documents (One-to-Many)
NonConformity.hasMany(QmsDocument, {
  foreignKey: 'related_nc_id',
  as: 'ncDocuments'
});

QmsDocument.belongsTo(NonConformity, {
  foreignKey: 'related_nc_id',
  as: 'relatedNonConformity'
});

// CapaAction - QMS Documents (One-to-Many)
CapaAction.hasMany(QmsDocument, {
  foreignKey: 'related_capa_id',
  as: 'capaDocuments'
});

QmsDocument.belongsTo(CapaAction, {
  foreignKey: 'related_capa_id',
  as: 'relatedCapa'
});

// Quote Tracker Associations

// Client - Quotes (One-to-Many)
Client.hasMany(Quote, {
  foreignKey: 'client_id',
  as: 'quotes'
});

Quote.belongsTo(Client, {
  foreignKey: 'client_id',
  as: 'client'
});

// User - Quotes (assigned_to)
User.hasMany(Quote, {
  foreignKey: 'assigned_to',
  as: 'assignedQuotes'
});

Quote.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});

// User - Quotes (created_by)
User.hasMany(Quote, {
  foreignKey: 'created_by',
  as: 'createdQuotes'
});

Quote.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// Quote - Current Milestone
Quote.belongsTo(QuoteMilestone, {
  foreignKey: 'current_milestone_id',
  as: 'currentMilestone'
});

// Quote - Milestone Tracking (One-to-Many)
Quote.hasMany(QuoteMilestoneTracking, {
  foreignKey: 'quote_id',
  as: 'milestoneTracking'
});

QuoteMilestoneTracking.belongsTo(Quote, {
  foreignKey: 'quote_id',
  as: 'quote'
});

// QuoteMilestone - Tracking (One-to-Many)
QuoteMilestone.hasMany(QuoteMilestoneTracking, {
  foreignKey: 'milestone_id',
  as: 'tracking'
});

QuoteMilestoneTracking.belongsTo(QuoteMilestone, {
  foreignKey: 'milestone_id',
  as: 'milestone'
});

// User - QuoteMilestoneTracking (assigned_to)
User.hasMany(QuoteMilestoneTracking, {
  foreignKey: 'assigned_to',
  as: 'assignedMilestones'
});

QuoteMilestoneTracking.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});

// Quote - Actions (One-to-Many)
Quote.hasMany(QuoteAction, {
  foreignKey: 'quote_id',
  as: 'actions'
});

QuoteAction.belongsTo(Quote, {
  foreignKey: 'quote_id',
  as: 'quote'
});

// User - QuoteAction (assigned_to)
User.hasMany(QuoteAction, {
  foreignKey: 'assigned_to',
  as: 'assignedQuoteActions'
});

QuoteAction.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});

// User - QuoteAction (created_by)
User.hasMany(QuoteAction, {
  foreignKey: 'created_by',
  as: 'createdQuoteActions'
});

QuoteAction.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// Quote - Documents (One-to-Many)
Quote.hasMany(QuoteDocument, {
  foreignKey: 'quote_id',
  as: 'documents'
});

QuoteDocument.belongsTo(Quote, {
  foreignKey: 'quote_id',
  as: 'quote'
});

// User - QuoteDocument (uploaded_by)
User.hasMany(QuoteDocument, {
  foreignKey: 'uploaded_by',
  as: 'uploadedQuoteDocuments'
});

QuoteDocument.belongsTo(User, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});

// Quote - Activity Log (One-to-Many)
Quote.hasMany(QuoteActivityLog, {
  foreignKey: 'quote_id',
  as: 'activityLog'
});

QuoteActivityLog.belongsTo(Quote, {
  foreignKey: 'quote_id',
  as: 'quote'
});

// User - QuoteActivityLog
User.hasMany(QuoteActivityLog, {
  foreignKey: 'user_id',
  as: 'quoteActivities'
});

QuoteActivityLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Quote - Project (One-to-One)
Quote.belongsTo(Project, {
  foreignKey: 'project_id',
  as: 'project'
});

Project.hasOne(Quote, {
  foreignKey: 'project_id',
  as: 'sourceQuote'
});

// User - PersonalTask
User.hasMany(PersonalTask, {
  foreignKey: 'user_id',
  as: 'personalTasks'
});

PersonalTask.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Sync models (only in development)
const syncModels = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Models synchronized with database');
    }
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
  }
};

module.exports = {
  sequelize,
  User,
  
  // ==========================================
  // Core CQM Models
  // ==========================================
  ManufacturingFacility,
  Project, // Backward compatibility alias for ManufacturingFacility
  
  TestResult,
  Task, // Backward compatibility alias for TestResult
  
  Audit,
  Milestone, // Backward compatibility alias for Audit
  
  NonConformity,
  Risk, // Backward compatibility alias for NonConformity
  
  CapaAction,
  ChangeRequest, // Backward compatibility alias for CapaAction
  
  QmsDocument,
  ProjectDocument, // Backward compatibility alias for QmsDocument
  
  ISOComplianceRecord,
  QualityMetric, // Backward compatibility alias for ISOComplianceRecord
  
  // ==========================================
  // Supporting Models
  // ==========================================
  ProjectCharter,
  Stakeholder,
  LessonLearned,
  TaskDependency,
  Budget,
  Expense,
  EVMSnapshot,
  QualityInspection,
  Defect,
  TeamMember,
  ResourceAllocation,
  StatusReport,
  MeetingMinute,
  CommunicationLog,
  Requirement,
  WBSItem,
  Vendor,
  Contract,
  
  // ==========================================
  // Quote Tracker Models
  // ==========================================
  Client,
  Quote,
  QuoteMilestone,
  QuoteMilestoneTracking,
  QuoteAction,
  QuoteDocument,
  QuoteActivityLog,
  
  // ==========================================
  // Personal Task Management
  // ==========================================
  PersonalTask,
  
  syncModels
};
